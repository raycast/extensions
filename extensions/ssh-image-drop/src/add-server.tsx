import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { upsertManagedBlock } from "./lib/sshConfigText";
import { isValidName, isValidPort } from "./lib/validate";
import { addRecent, setAuthMode } from "./runtime/store";
import {
  addIncludeLine,
  deleteKeychainPassword,
  includePresent,
  installKeyWithPassword,
  MANAGED_KEY_PATH,
  readAllHosts,
  readManagedConfig,
  saveKeychainPassword,
  writeManagedConfig,
} from "./runtime/system";

interface Values {
  alias: string;
  hostName: string;
  user: string;
  port: string;
  password: string;
  useKey: boolean;
}

function validate(v: Values): Partial<Record<keyof Values, string>> {
  const errors: Partial<Record<keyof Values, string>> = {};
  if (!isValidName(v.alias))
    errors.alias = "Letters, digits, . _ - (no @, no spaces)";
  if (!isValidName(v.hostName))
    errors.hostName = "Host name or IPv4 — no @ (user is a separate field)";
  if (!isValidName(v.user)) errors.user = "Letters, digits, . _ - (no spaces)";
  if (!isValidPort(v.port)) errors.port = "1–65535";
  if (!v.password)
    errors.password = "Required — used once (key mode) or stored in Keychain";
  else if (/[\r\n]/.test(v.password))
    errors.password = "Newlines are not allowed";
  const { managed, config } = readAllHosts();
  if ([...managed, ...config].includes(v.alias))
    errors.alias =
      "Alias already exists — choose a different alias (or edit ~/.ssh/ssh_image_drop_config manually)";
  return errors;
}

/**
 * Include 동의가 필요하면 먼저 받는다 — 단, 실제 기록은 등록 성공 직전(managed 기록과 함께) 수행.
 * 중도 취소(키 설치 실패 후 Keychain 거절 등) 시 어떤 파일도 남기지 않아 "Nothing was saved"가 사실이 된다.
 */
async function ensureIncludeConsented(): Promise<boolean> {
  if (includePresent()) return true;
  return confirmAlert({
    title: "Allow a one-time change to ~/.ssh/config?",
    message:
      'Adds a single line "Include ~/.ssh/ssh_image_drop_config" at the top (a timestamped backup is created first). Servers you add live only in that managed file.',
    primaryAction: { title: "Allow", style: Alert.ActionStyle.Default },
  });
}

async function register(v: Values): Promise<void> {
  if (!(await ensureIncludeConsented())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Registration canceled",
      message:
        "The Include line is required so ssh can find the server. Run Add Server again when ready.",
    });
    return;
  }
  let mode: "key" | "keychain" = v.useKey ? "key" : "keychain";
  if (mode === "key") {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing key on ${v.hostName}…`,
    });
    try {
      await installKeyWithPassword(v.user, v.hostName, v.port, v.password);
      await toast.hide();
    } catch (e) {
      await toast.hide();
      // 스펙 §8: 자동 전환 금지 — 사용자 확인 후에만 Keychain 모드로
      const switchToKeychain = await confirmAlert({
        title: "Key install failed",
        message: `${(e as Error).message}\n\nStore the password in macOS Keychain instead? (used on every transfer)`,
        primaryAction: {
          title: "Use Keychain",
          style: Alert.ActionStyle.Default,
        },
      });
      if (!switchToKeychain) {
        // 스펙 §11-3 fallback: Terminal 수동 설치 → 재실행 시 ssh-copy-id가 키 인증으로 무암호 성공해 등록만 이어짐
        await showToast({
          style: Toast.Style.Failure,
          title: "Registration canceled",
          message: `Nothing was saved. Manual option: run ssh-copy-id -i ~/.ssh/ssh_image_drop_ed25519.pub ${v.user}@${v.hostName} in Terminal, then re-run Add Server.`,
        });
        return;
      }
      mode = "keychain";
    }
  }
  if (mode === "keychain") {
    try {
      await saveKeychainPassword(v.alias, v.password);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Keychain save failed",
        message: `${(e as Error).message}\n\nRetry Add Server — nothing was saved.`,
      });
      return;
    }
  }
  try {
    if (!includePresent()) addIncludeLine(); // 동의는 흐름 선두에서 획득 완료 — 기록은 성공 경로에서만
    const entry = {
      alias: v.alias,
      hostName: v.hostName,
      user: v.user,
      port: v.port,
      identityFile: mode === "key" ? MANAGED_KEY_PATH : undefined,
    };
    writeManagedConfig(upsertManagedBlock(readManagedConfig(), entry));
  } catch (e) {
    // 스펙 §8: 키 설치 성공 후 config 기록 실패 — 원격 잔여물 고지 + 재시도 안내.
    // Keychain 모드였다면 방금 저장한 자격증명을 롤백해 고아 항목을 남기지 않는다.
    if (mode === "keychain")
      await deleteKeychainPassword(v.alias).catch(() => undefined);
    await showToast({
      style: Toast.Style.Failure,
      title: "Saving server config failed",
      message: `${(e as Error).message}\n\n${mode === "key" ? "A public key is already installed on the server. " : ""}Retry Add Server (safe to repeat).`,
    });
    return;
  }
  await setAuthMode(v.alias, mode);
  await addRecent(v.alias);
  await showToast({
    style: Toast.Style.Success,
    title: `Added ${v.alias}`,
    message:
      mode === "key"
        ? "SSH key auth ready"
        : "Password saved to macOS Keychain",
  });
  await popToRoot();
}

export default function AddServer() {
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>(
    {},
  );
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Server"
            onSubmit={async (v: Values) => {
              const es = validate(v);
              setErrors(es);
              if (Object.keys(es).length === 0) await register(v);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="alias"
        title="Alias"
        placeholder="example"
        error={errors.alias}
      />
      <Form.TextField
        id="hostName"
        title="Host Name"
        placeholder="server.example.com or 192.0.2.10"
        error={errors.hostName}
      />
      <Form.TextField
        id="user"
        title="User"
        placeholder="deploy"
        error={errors.user}
      />
      <Form.TextField
        id="port"
        title="Port"
        defaultValue="22"
        error={errors.port}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        info="Default: password stored in macOS Keychain (used on every transfer). Check the box to install an SSH key instead (password used once, then discarded)."
        error={errors.password}
      />
      <Form.Checkbox
        id="useKey"
        label="Use SSH key authentication (installs a key; password not stored)"
        defaultValue={false}
      />
    </Form>
  );
}

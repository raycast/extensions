import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  ManagedEntry,
  removeManagedBlock,
  upsertManagedBlock,
} from "../lib/sshConfigText";
import { isValidName, isValidPort } from "../lib/validate";
import {
  addRecent,
  forgetHost,
  getAuthMode,
  setAuthMode,
} from "../runtime/store";
import { platform } from "../runtime/platform";
import {
  addIncludeLine,
  deleteServerPassword,
  getManagedEntry,
  includePresent,
  installKeyWithPassword,
  managedKeyConfigValue,
  readAllHosts,
  readManagedConfig,
  saveServerPassword,
  writeManagedConfig,
} from "../runtime/system";

interface Values {
  alias: string;
  hostName: string;
  user: string;
  port: string;
  password: string;
  useKey: boolean;
}

export type FormMode =
  | { kind: "add"; onDone?: () => void }
  | { kind: "edit"; alias: string; onDone?: () => void };

function validate(
  v: Values,
  editing: boolean,
): Partial<Record<keyof Values, string>> {
  const errors: Partial<Record<keyof Values, string>> = {};
  // 편집 시 alias는 read-only(Description) — 검증·중복 확인 대상에서 제외
  if (!editing && !isValidName(v.alias))
    errors.alias = "Letters, digits, . _ - (no @, no spaces)";
  if (!isValidName(v.hostName))
    errors.hostName = "Host name or IPv4 — no @ (user is a separate field)";
  if (!isValidName(v.user)) errors.user = "Letters, digits, . _ - (no spaces)";
  if (!isValidPort(v.port)) errors.port = "1–65535";
  // 편집: 비밀번호는 선택(비우면 기존 유지). 추가: 필수.
  if (!editing && !v.password)
    errors.password = "Required — used once (key mode) or stored for transfers";
  else if (v.password && /[\r\n]/.test(v.password))
    errors.password = "Newlines are not allowed";
  if (!editing) {
    const { managed, config } = readAllHosts();
    // 대소문자 비구분 비교 — NTFS/APFS는 대소문자를 구분하지 않아 Prod/prod가 같은
    // credential blob 파일을 공유하게 되고, 한쪽 등록·삭제가 다른 쪽 PW를 덮어쓰거나 지운다
    const lower = v.alias.toLowerCase();
    if ([...managed, ...config].some((h) => h.toLowerCase() === lower))
      errors.alias =
        "Alias already exists — choose a different alias (or edit ~/.ssh/ssh_image_drop_config manually)";
  }
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

/** 신규 등록. 성공 시 true — 화면 전환(pop)은 호출부가 결정한다. */
async function register(v: Values): Promise<boolean> {
  if (!(await ensureIncludeConsented())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Registration canceled",
      message:
        "The Include line is required so ssh can find the server. Try again from Manage Servers when ready.",
    });
    return false;
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
        message: `${(e as Error).message}\n\nStore the password in the ${platform.credentialStoreName} instead? (used on every transfer)`,
        primaryAction: {
          // 본문(credentialStoreName)과 일치하는 플랫폼 중립 라벨 — Windows는 DPAPI라 "Keychain" 부적합
          title: "Store Password",
          style: Alert.ActionStyle.Default,
        },
      });
      if (!switchToKeychain) {
        // 스펙 §11-3 fallback: Terminal 수동 설치 → 재실행 시 ssh-copy-id가 키 인증으로 무암호 성공해 등록만 이어짐
        await showToast({
          style: Toast.Style.Failure,
          title: "Registration canceled",
          message: `Nothing was saved. Manual option: ${platform.manualKeyInstallHint(v.user, v.hostName)}`,
        });
        return false;
      }
      mode = "keychain";
    }
  }
  if (mode === "keychain") {
    try {
      await saveServerPassword(v.alias, v.password);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Password save failed",
        message: `${(e as Error).message}\n\nRetry — nothing was saved.`,
      });
      return false;
    }
  }
  try {
    if (!includePresent()) addIncludeLine(); // 동의는 흐름 선두에서 획득 완료 — 기록은 성공 경로에서만
    const entry: ManagedEntry = {
      alias: v.alias,
      hostName: v.hostName,
      user: v.user,
      port: v.port,
      identityFile: mode === "key" ? managedKeyConfigValue() : undefined,
    };
    writeManagedConfig(upsertManagedBlock(readManagedConfig(), entry));
  } catch (e) {
    // 스펙 §8: 키 설치 성공 후 config 기록 실패 — 원격 잔여물 고지 + 재시도 안내.
    // Keychain 모드였다면 방금 저장한 자격증명을 롤백해 고아 항목을 남기지 않는다.
    if (mode === "keychain")
      await deleteServerPassword(v.alias).catch(() => undefined);
    await showToast({
      style: Toast.Style.Failure,
      title: "Saving server config failed",
      message: `${(e as Error).message}\n\n${mode === "key" ? "A public key is already installed on the server. " : ""}Retry (safe to repeat).`,
    });
    return false;
  }
  await setAuthMode(v.alias, mode);
  await addRecent(v.alias);
  await showToast({
    style: Toast.Style.Success,
    title: `Added ${v.alias}`,
    message:
      mode === "key"
        ? "SSH key auth ready"
        : `Password saved to the ${platform.credentialStoreName}`,
  });
  return true;
}

/**
 * 관리 서버 삭제 흐름 (confirm → config 제거 → credential·recents 정리).
 * Manage Servers·전송 셀렉터 리스트가 공유하는 단일 소스 — onDeleted는 목록 갱신 콜백.
 */
export async function deleteServerFlow(
  alias: string,
  onDeleted: () => void,
): Promise<void> {
  const confirmed = await confirmAlert({
    title: `Delete ${alias}?`,
    icon: Icon.Trash,
    message:
      "Removes it from ~/.ssh/ssh_image_drop_config and deletes its saved password. A public key already installed on the server is NOT removed.",
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  // 실패 가능성이 가장 큰 config 쓰기를 선행 게이트로 — 실패 시 아무것도 바꾸지 않고 중단(재시도 가능).
  try {
    writeManagedConfig(removeManagedBlock(readManagedConfig(), alias));
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Couldn't delete ${alias}`,
      message: (e as Error).message,
    });
    return;
  }
  // config 제거 성공 — 서버는 이미 삭제됨. 이후 정리는 best-effort이되 credential 삭제 실패는 삼키지 않고 고지.
  // authMode와 무관하게 무조건 시도(항목 없음은 내부에서 성공 처리) — authMode 유실 시 credential 잔존 방지.
  let credentialError: string | null = null;
  try {
    await deleteServerPassword(alias);
  } catch (e) {
    credentialError = (e as Error).message;
  }
  await forgetHost(alias).catch(() => undefined);
  onDeleted();
  if (credentialError) {
    // config·목록에서는 사라졌지만 PW가 남음 — 성공으로 오인시키지 않고 수동 제거 안내
    await showToast({
      style: Toast.Style.Failure,
      title: `Deleted ${alias}, but its saved password remains`,
      message: `${platform.credentialRemovalHint} ${credentialError}`,
    });
  } else {
    await showToast({
      style: Toast.Style.Success,
      title: `Deleted ${alias}`,
    });
  }
}

/**
 * 기존 관리 서버의 연결 정보(HostName/User/Port)를 교체한다. alias·인증 모드는 불변.
 * 비밀번호가 입력되고 keychain 모드면 저장된 PW도 갱신. 실패 시 false.
 */
async function updateServer(alias: string, v: Values): Promise<boolean> {
  const mode = await getAuthMode(alias);
  try {
    const entry: ManagedEntry = {
      alias,
      hostName: v.hostName,
      user: v.user,
      port: v.port,
      // key 모드는 IdentityFile 유지 필수 — 없으면 키 인증이 깨진다
      identityFile: mode === "key" ? managedKeyConfigValue() : undefined,
    };
    writeManagedConfig(upsertManagedBlock(readManagedConfig(), entry));
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Saving server config failed",
      message: `${(e as Error).message}\n\nRetry (safe to repeat).`,
    });
    return false;
  }
  // 비밀번호 갱신은 keychain 모드에서만 의미 — 입력이 있을 때만
  if (v.password && mode === "keychain") {
    try {
      await saveServerPassword(alias, v.password);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Password update failed",
        message: `${(e as Error).message}\n\nConnection settings were saved; the password was not changed.`,
      });
      return false;
    }
  }
  await showToast({ style: Toast.Style.Success, title: `Updated ${alias}` });
  return true;
}

export function ServerForm(props: { mode: FormMode }) {
  const { mode } = props;
  const editing = mode.kind === "edit";
  const { pop } = useNavigation();
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>(
    {},
  );

  // 편집 모드에서만 기존 값·인증 모드를 로드 (추가 모드는 로딩 없이 즉시 렌더).
  // dep은 alias(primitive) — mode 객체는 매 렌더 새로 생성되므로, 편집 중 폼이 remount되어 입력이 유실되는 것 방지.
  const { data: init, isLoading } = usePromise(
    async (alias: string | null) => {
      if (!alias) return null;
      return {
        entry: getManagedEntry(alias),
        authMode: await getAuthMode(alias),
      };
    },
    [editing ? mode.alias : null],
  );

  if (editing && isLoading) return <Form isLoading />;
  // 로드 완료 후 entry가 없음(블록 삭제됨) 또는 로드 자체 실패(init undefined) — 빈 폼 대신 안내
  if (editing && !init?.entry) {
    return (
      <Form>
        <Form.Description
          title="Couldn't load this server"
          text={`No managed config block for "${(mode as { alias: string }).alias}" — it may have been removed. Close and reopen the list.`}
        />
      </Form>
    );
  }

  const entry = init?.entry ?? undefined;
  const isKeychain = init?.authMode === "keychain";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={editing ? "Save Changes" : "Add Server"}
            onSubmit={async (v: Values) => {
              const es = validate(v, editing);
              setErrors(es);
              if (Object.keys(es).length > 0) return;
              if (mode.kind === "edit") {
                if (await updateServer(mode.alias, v)) {
                  mode.onDone?.();
                  pop();
                }
              } else if (await register(v)) {
                // 목록에서 push된 경우 목록으로 복귀·갱신. 루트 렌더(서버 0개 폼)에서는 pop이 no-op —
                // onDone(revalidate)이 목록 뷰로 전환시킨다.
                mode.onDone?.();
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      {editing ? (
        <Form.Description
          title="Alias"
          text={(mode as { alias: string }).alias}
        />
      ) : (
        <Form.TextField
          id="alias"
          title="Alias"
          placeholder="example"
          error={errors.alias}
        />
      )}
      <Form.TextField
        id="hostName"
        title="Host Name"
        placeholder="server.example.com or 192.0.2.10"
        defaultValue={entry?.hostName}
        error={errors.hostName}
      />
      <Form.TextField
        id="user"
        title="User"
        placeholder="deploy"
        defaultValue={entry?.user}
        error={errors.user}
      />
      <Form.TextField
        id="port"
        title="Port"
        defaultValue={entry?.port ?? "22"}
        error={errors.port}
      />
      {editing ? (
        // 편집: keychain 서버만 비밀번호 갱신 의미. key 모드는 인증 변경=삭제 후 재등록.
        isKeychain && (
          <Form.PasswordField
            id="password"
            title="New Password"
            info="Leave blank to keep the current saved password."
            error={errors.password}
          />
        )
      ) : (
        <>
          <Form.PasswordField
            id="password"
            title="Password"
            info={`Default: password stored in the ${platform.credentialStoreName} (used on every transfer). Check the box to install an SSH key instead (password used once, then discarded).`}
            error={errors.password}
          />
          <Form.Checkbox
            id="useKey"
            label="Use SSH key authentication (installs a key; password not stored)"
            defaultValue={false}
          />
        </>
      )}
    </Form>
  );
}

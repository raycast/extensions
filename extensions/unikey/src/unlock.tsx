import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { vaultExists, vaultDir } from "./vault";
import { ensureVaultFile, setMaster, tryAutoUnlock, unlock } from "./session";
import { keychainSave } from "./keychain";

/**
 * Unlock gate shown when the master password isn't cached.
 *
 * On mount it tries a silent auto-unlock: read the master password
 * from the macOS Keychain and decrypt. No popups, no focus steal.
 * Falls back to the manual password form when nothing is stored yet.
 */
export default function UnlockView(props: { dir: string; onUnlocked: () => void }) {
  const [error, setError] = useState<string | undefined>();
  const [autoTried, setAutoTried] = useState(false);
  const [checking, setChecking] = useState(() => vaultExists(props.dir));

  const isNew = !vaultExists(props.dir);

  const attemptAutoUnlock = useCallback(async () => {
    if (!vaultExists(props.dir)) {
      setChecking(false);
      return;
    }
    const vault = await tryAutoUnlock(props.dir);
    if (vault) {
      await showToast({ style: Toast.Style.Success, title: "Vault unlocked" });
      props.onUnlocked();
    } else {
      setChecking(false);
    }
    setAutoTried(true);
  }, [props.dir]);

  useEffect(() => {
    void attemptAutoUnlock();
  }, [attemptAutoUnlock]);

  async function handleSubmit(values: { password: string; confirm?: string }): Promise<boolean> {
    const pw = values.password;
    if (!pw) {
      setError("Password is required");
      return false;
    }

    if (isNew && values.confirm !== pw) {
      setError("Passwords don't match");
      return false;
    }

    try {
      if (isNew) {
        ensureVaultFile(props.dir, pw);
        setMaster(pw);
        await keychainSave(pw);
      } else {
        unlock(props.dir, pw);
        await keychainSave(pw);
      }
      await showToast({
        style: Toast.Style.Success,
        title: isNew ? "Vault created" : "Vault unlocked",
        message: "Master password saved to Keychain — next sessions open instantly",
      });
      props.onUnlocked();
      return true;
    } catch (e) {
      const msg = String(e);
      setError(msg.includes("WRONG_PASSWORD") ? "Wrong master password" : msg);
      return false;
    }
  }

  if (checking && !autoTried && !isNew) {
    return (
      <Form navigationTitle="UniKey">
        <Form.Description text="Opening vault…" />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle={isNew ? "Create Vault" : "Unlock Vault"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isNew ? "Create Vault" : "Unlock"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Vault location: ${vaultDir(props.dir)}`} />
      <Form.PasswordField id="password" title="Master Password" autoFocus error={error} />
      {isNew && <Form.PasswordField id="confirm" title="Confirm Password" />}
      {isNew && (
        <Form.Description text="This password encrypts every entry. It is stored in your Keychain so future sessions unlock automatically." />
      )}
    </Form>
  );
}

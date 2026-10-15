import { Action, ActionPanel, Form, Icon, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useState } from "react";
import { getPrefs } from "../lib/preferences";
import { unlock, type ActiveSession } from "../lib/session";
import { describeError } from "../lib/errors";

interface Props {
  onUnlocked: (session: ActiveSession) => void;
}

/** Form di sblocco: chiede solo la master password (email e server sono preferenze). */
export function UnlockForm({ onUnlocked }: Props) {
  const prefs = getPrefs();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password) {
      setError("Inserisci la master password");
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sblocco in corso…" });
    try {
      const session = await unlock(password);
      setPassword("");
      toast.style = Toast.Style.Success;
      toast.title = "Vault sbloccato";
      onUnlocked(session);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sblocco fallito";
      toast.message = describeError(err);
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      navigationTitle="Sblocca Passig"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sblocca" icon={Icon.LockUnlocked} onSubmit={submit} />
          <Action title="Apri preferenze" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description title="Account" text={`${prefs.email} · ${prefs.serverUrl}`} />
      <Form.PasswordField
        id="masterPassword"
        title="Master password"
        value={password}
        error={error}
        onChange={(v) => {
          setPassword(v);
          setError(undefined);
        }}
        autoFocus
      />
      <Form.Description text={`Le chiavi restano sbloccate per ${prefs.autoLockMinutes} minuti (preferenza Auto-lock).`} />
    </Form>
  );
}

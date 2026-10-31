import { Action, ActionPanel, Form, Icon, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useState } from "react";
import { t } from "../lib/text";
import { getPrefs } from "../lib/preferences";
import { unlock, type ActiveSession } from "../lib/session";
import { describeError } from "../lib/errors";

interface Props {
  onUnlocked: (session: ActiveSession) => void;
}

/** Unlock form: asks only for the master password (email and server come from the preferences). */
export function UnlockForm({ onUnlocked }: Props) {
  const prefs = getPrefs();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password) {
      setError(t("unlock.required"));
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: t("unlock.inProgress") });
    try {
      const session = await unlock(password);
      setPassword("");
      toast.style = Toast.Style.Success;
      toast.title = t("unlock.success");
      onUnlocked(session);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = t("unlock.failed");
      toast.message = describeError(err);
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      navigationTitle={t("unlock.navTitle")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("unlock.action")} icon={Icon.LockUnlocked} onSubmit={submit} />
          <Action title={t("common.openPreferences")} icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description title={t("unlock.account")} text={`${prefs.email} · ${prefs.serverUrl}`} />
      <Form.PasswordField
        id="masterPassword"
        title={t("unlock.masterPassword")}
        value={password}
        error={error}
        onChange={(v) => {
          setPassword(v);
          setError(undefined);
        }}
        autoFocus
      />
      <Form.Description text={t("unlock.autoLockInfo", { minutes: Number(prefs.autoLockMinutes) })} />
    </Form>
  );
}

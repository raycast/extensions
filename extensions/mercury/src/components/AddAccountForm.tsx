import { useRef } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { MercuryLogin, saveLogin } from "../logins";
import { copyErrorAction, TOKEN_SETTINGS_URL } from "../mercury";

/** Add a Mercury account (personal or business) by its API token, or replace an existing account's token. */
export function AddAccountForm({ onSaved, replacing }: { onSaved: () => void; replacing?: MercuryLogin }) {
  const { pop } = useNavigation();
  // A second ⌘↵ while Mercury is still checking would save twice and pop the screen underneath.
  const submitting = useRef(false);

  async function submit({ token }: { token: string }) {
    if (!token.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Paste an API token first",
        primaryAction: copyErrorAction("Paste an API token first"),
      });
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking token with Mercury" });
    try {
      const { login, replaced } = await saveLogin(token, replacing);
      toast.style = Toast.Style.Success;
      toast.title = replaced ? `Updated ${login.name}` : `Added ${login.name}`;
      onSaved();
      pop();
    } catch (error) {
      submitting.current = false;
      await showFailureToast(error, {
        title: "Mercury didn't accept that token",
        primaryAction: copyErrorAction(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={replacing ? `Update Token for ${replacing.name}` : "Add Mercury Account"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={replacing ? "Update Token" : "Add Account"} icon={Icon.Plus} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Mercury Token Settings" url={TOKEN_SETTINGS_URL} />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="token" title="API Token" placeholder="secret-token:mercury_production_…" autoFocus />
      <Form.Description
        text={
          replacing
            ? `Paste a new Read Only token for ${replacing.name}.`
            : "Paste a Read Only token to add an account."
        }
      />
    </Form>
  );
}

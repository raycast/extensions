import { showToast, Form, ActionPanel, Toast, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { Bitwarden } from "./api";
import { VaultState } from "./types";

export function TroubleshootingGuide(): JSX.Element {
  showToast(Toast.Style.Failure, "Bitwarden CLI not found");
  const markdown = `# The Bitwarden CLI was not found
## Please check that:

1. The Bitwarden CLI is [correctly installed](https://bitwarden.com/help/article/cli/#download-and-install)
1. If you did not install bitwarden using brew, please check that path of the installation matches the \`Bitwarden CLI Installation Path\` extension setting
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={"Copy Homebrew Installation Command"} content="brew install bitwarden-cli" />
          <Action.OpenInBrowser url="https://bitwarden.com/help/article/cli/#download-and-install" />
        </ActionPanel>
      }
    />
  );
}

export function UnlockForm(props: { onUnlock: (token: string) => void; bitwardenApi: Bitwarden }): JSX.Element {
  const { bitwardenApi, onUnlock } = props;
  const [vaultState, setVaultState] = useState<VaultState | null>(null);

  useEffect(() => {
    bitwardenApi.status().then((vaultState) => {
      setVaultState(vaultState);
    });
  }, []);

  let userMessage = "...";
  let serverMessage = "...";
  if (vaultState) {
    const { status, userEmail, serverUrl } = vaultState;
    userMessage = status == "unauthenticated" ? "Logged out" : `Locked (${userEmail})`;
    serverMessage = serverUrl || "Bitwarden Hosted";
  }

  async function onSubmit(values: { password: string }) {
    if (values.password.length == 0) {
      showToast(Toast.Style.Failure, "Failed to unlock vault.", "Missing password.");
      return;
    }
    try {
      const toast = await showToast(Toast.Style.Animated, "Unlocking Vault...", "Please wait.");
      const state = await bitwardenApi.status();
      if (state.status == "unauthenticated") {
        try {
          await bitwardenApi.login();
        } catch (error) {
          showToast(Toast.Style.Failure, "Failed to unlock vault.", "Please check your API Key and Secret.");
          return;
        }
      }
      const sessionToken = await bitwardenApi.unlock(values.password);
      toast.hide();
      onUnlock(sessionToken);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to unlock vault.", "Invalid credentials.");
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Unlock" onSubmit={onSubmit} shortcut={{ key: "enter", modifiers: [] }} />
        </ActionPanel>
      }
    >
      <Form.Description title="Server" text={serverMessage} />
      <Form.Description title="Vault Status" text={userMessage} />
      <Form.PasswordField autoFocus id="password" title="Master Password" />
    </Form>
  );
}

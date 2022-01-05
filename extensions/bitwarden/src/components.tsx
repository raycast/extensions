import {
  showToast,
  ToastStyle,
  Form,
  ActionPanel,
  SubmitFormAction,
  Detail,
  CopyToClipboardAction,
} from "@raycast/api";
import { Bitwarden } from "./api";

export function TroubleshootingGuide(): JSX.Element {
  showToast(ToastStyle.Failure, "Bitwarden CLI not found");
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
          <CopyToClipboardAction title={"Copy Homebrew Installation Command"} content="brew install bitwarden-cli" />
        </ActionPanel>
      }
    />
  );
}

export function UnlockForm(props: {
  setSessionToken: (session: string) => void;
  bitwardenApi: Bitwarden;
}): JSX.Element {
  async function onSubmit(values: { password: string }) {
    try {
      const toast = await showToast(ToastStyle.Animated, "Unlocking Vault...", "Please wait");
      const sessionToken = await props.bitwardenApi.unlock(values.password);
      toast.hide();

      props.setSessionToken(sessionToken);
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to unlock vault", "Invalid credentials");
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Unlock" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="password" title="Master Password" />
    </Form>
  );
}

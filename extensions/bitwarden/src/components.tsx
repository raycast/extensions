import {
  showToast,
  ToastStyle,
  Form,
  ActionPanel,
  SubmitFormAction,
  Detail,
  CopyToClipboardAction,
  getPreferenceValues,
} from "@raycast/api";
import execa from "execa";
import { getWorkflowEnv } from "./utils";

export function TroubleshootingGuide(): JSX.Element {
  showToast(ToastStyle.Failure, "Bitwarden CLI not found");
  const { path } = getPreferenceValues();
  const markdown = `# The Bitwarden CLI was not found
## Please check that:

1. The Bitwarden CLI is [correctly installed](https://bitwarden.com/help/article/cli/#download-and-install)
1. The path of the installation matches the Bitwarden CLI Installation Path extension setting
> Currently set to: \`${path}\`
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

export function UnlockForm(props: { setSessionToken: (session: string) => void }): JSX.Element {
  async function onSubmit(values: { password: string }) {
    try {
      const toast = await showToast(ToastStyle.Animated, "Unlocking Vault...", "Please wait");
      const { stdout: sessionToken } = await execa("bw", ["unlock", values.password, "--raw"], {
        env: getWorkflowEnv(),
      });

      toast.hide();
      props.setSessionToken(sessionToken);
    } catch (error) {
      console.log(error);
      showToast(ToastStyle.Failure, "Failed to unlock vault", "Invalid password");
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

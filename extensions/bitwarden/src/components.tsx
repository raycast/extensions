import { showToast, ToastStyle, Form, ActionPanel, SubmitFormAction, Detail, CopyToClipboardAction } from "@raycast/api";
import execa from "execa";
import { getWorkflowEnv } from "./utils";

export function TroubleshootingGuide(): JSX.Element {
  showToast(ToastStyle.Failure, "Bitwarden Cli not found");
  return (
    <Detail
      markdown={`# The Bitwarden Cli was not found

## Please check that:

- The Bitwarden CLI is [correctly installed](https://bitwarden.com/help/article/cli/#download-and-install)
- The path of the installation match with the extensions settings
`}
   actions={
       <ActionPanel>
           <CopyToClipboardAction title={"Copy Brew Install Command"} content="brew install bitwarden-cli"/>
       </ActionPanel>
   } />
  );
}

export function UnlockForm(props: { setSessionToken: (session: string) => void }): JSX.Element {
  async function onSubmit(values: { password: string }) {
    try {
      const toast = await showToast(ToastStyle.Animated, "Unlocking Your Vault...", "It may takes some time");
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
      <Form.TextField id="password" title="Master password" />
    </Form>
  );
}

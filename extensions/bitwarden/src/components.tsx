import {
  showToast,
  ToastStyle,
  Form,
  ActionPanel,
  SubmitFormAction,
  Detail,
  CopyToClipboardAction,
} from "@raycast/api";
import { useState } from "react";
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
  const [password, setPassword] = useState("");
  const [hiddenPassword, setHiddenPassword] = useState("");

  async function onSubmit(values: { password: string }) {
    try {
      const toast = await showToast(ToastStyle.Animated, "Unlocking Vault...", "Please wait");
      const sessionToken = await props.bitwardenApi.unlock(password);
      toast.hide();

      props.setSessionToken(sessionToken);
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to unlock vault", "Invalid credentials");
    }
  }

  async function onChange(newValue: string) {
    const newLength: number = newValue.length;
    const oldLength: number = password.length;

    let newPassword: string = password;
    if (newLength > oldLength) {
      newPassword += newValue[newLength - 1];
    } else if (newLength < oldLength) {
      newPassword = newPassword.slice(0, newLength);
    } else {
      return;
    }

    setHiddenPassword("*".repeat(newLength));
    setPassword(newPassword);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Unlock" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="password" title="Master Password" onChange={onChange} value={hiddenPassword} />
    </Form>
  );
}

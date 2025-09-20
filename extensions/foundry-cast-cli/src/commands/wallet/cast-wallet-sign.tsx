import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastWalletSign: Command = {
  name: "Sign message",
  description: "Sign a message with a private key",
  component: Command,
};

const Arguments = {
  privateKey: { required: true, name: "Private Key", flag: "--private-key" },
  message: { required: true, name: "Message" },
} as const;

const successMessage = "Copied signature to clipboard";
const outputParser = (stdout: string) => stdout.replace("Signature: ", "").replace("\n", "");

export default function Command() {
  const { isLoading, result, execute } = useCast("wallet sign", Arguments, { successMessage, outputParser });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(v) => execute({ privateKey: v.privateKey, message: `"${v.message}"` })} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-wallet-sign" />
          <Action.CopyToClipboard title="Copy signature to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="privateKey"
        title="Private Key"
        placeholder="0xb1c5b4ca56759c119f897e823f125d2f9f28283e59938f7a05afc857e5fbf48f"
        info="The private key to use for signing the message"
      />
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Hello there, General Kenobi!"
        info="The message to sign"
      />
    </Form>
  );
}

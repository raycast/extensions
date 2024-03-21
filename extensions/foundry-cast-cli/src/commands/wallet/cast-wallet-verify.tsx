import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastWalletVerify: Command = {
  name: "Wallet Verify",
  description: "Verify the signature of a message",
  component: Command,
};

const Arguments = {
  address: { required: true, name: "Address", flag: "--address" },
  message: { required: true, name: "Message" },
  signature: { required: true, name: "Signature" },
} as const;

const successMessage = "Signature is valid!";

export default function Command() {
  const { isLoading, result, execute } = useCast("wallet verify", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(v) => execute({ address: v.address, message: `"${v.message}"`, signature: v.signature })}
          />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-wallet-verify" />
          <Action.CopyToClipboard title="Copy signature to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Address"
        placeholder="0x4e59b44847b379578588920ca78fbf26c0b4956c"
        info="The address of the message signer"
      />
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Hello there, General Kenobi!"
        info="The original message"
      />
      <Form.TextArea
        id="signature"
        title="Signature"
        placeholder="0xd5c5135c09bcdcb708f587b8e9ac9589d94c09cfaeb9a2264619453d35b1bb3775b0bdd621a6f554b9ec6b809f21235f003b404d2752154f9e76968eb2fce8071c"
        info="The signature to verify"
      />
    </Form>
  );
}

import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastWalletAddress: Command = {
  name: "Wallet Address",
  description: "Convert a private key to an address",
  component: Command,
};

const Arguments = {
  privateKey: { required: true, name: "Private Key" },
} as const;

const successMessage = "Copied wallet address to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("wallet address", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-wallet-address" />
          <Action.CopyToClipboard title="Copy wallet address to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="privateKey"
        title="Private Key"
        placeholder="0xb1c5b4ca56759c119f897e823f125d2f9f28283e59938f7a05afc857e5fbf48f"
        info="The private key from which to derivate the address from"
      />
    </Form>
  );
}

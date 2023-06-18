import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import NetworkSelector from "../../lib/NetworkSelector";
import { Command } from "../types";

export const CastNonce: Command = {
  name: "Nonce",
  description: "Get the nonce for an account",
  component: Command,
};

const Arguments = {
  address: { required: true, name: "Address" },
} as const;

const successMessage = "Copied nonce to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("nonce", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-nonce" />
          <Action.CopyToClipboard title="Copy nonce to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Address"
        placeholder="beer.eth"
        info="The wallet address to query the nonce for"
      />

      <NetworkSelector />
    </Form>
  );
}

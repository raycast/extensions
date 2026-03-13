import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";
import NetworkSelector from "../../lib/NetworkSelector";

export const CastGasPrice: Command = {
  name: "Current Gas Price",
  description: "Get the current gas price",
  component: Command,
};

const Arguments = {} as const;

const successMessage = "Copied gas price to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("gas-price", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-gas-price" />
          <Action.CopyToClipboard title="Copy gas price to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <NetworkSelector />
    </Form>
  );
}

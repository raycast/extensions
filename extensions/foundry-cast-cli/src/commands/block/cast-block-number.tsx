import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";
import NetworkSelector from "../../lib/NetworkSelector";

export const CastBlockNumber: Command = {
  name: "Current Block Number",
  description: "Get the current block number",
  component: Command,
};

const Arguments = {} as const;

const successMessage = "Copied block number to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("block-number", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-block-number" />
          <Action.CopyToClipboard title="Copy block number to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <NetworkSelector />
    </Form>
  );
}

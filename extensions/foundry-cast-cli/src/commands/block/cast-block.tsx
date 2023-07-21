import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";
import NetworkSelector from "../../lib/NetworkSelector";

export const CastBlock: Command = {
  name: "Block Info",
  description: "Get the information about a block",
  component: Command,
};

const Arguments = {
  blockNumber: { required: false, name: "Block Number" },
  json: { required: false, name: "Save as JSON", flag: "--json", type: "boolean" },
} as const;

const successMessage = "Copied block info to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("block", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-block" />
          <Action.CopyToClipboard title="Copy block info to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="blockNumber"
        title="Block Number"
        placeholder="latest"
        info="This can be a block number, or any of the tags: earliest, finalized, safe, latest or pending"
      />

      <NetworkSelector />

      <Form.Checkbox id="json" label="Save as JSON" defaultValue={false} />
    </Form>
  );
}

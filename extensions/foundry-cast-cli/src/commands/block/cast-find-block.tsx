import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";
import NetworkSelector from "../../lib/NetworkSelector";

export const CastFindBlock: Command = {
  name: "Find block by timestamp",
  description: "Get the block number closest to the provided timestamp",
  component: Command,
};

const Arguments = {
  timestamp: { required: true, name: "UNIX Timestamp" },
} as const;

const successMessage = "Copied block number to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("find-block", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-find-block" />
          <Action.CopyToClipboard title="Copy block number to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="timestamp"
        title="UNIX Timestamp"
        placeholder="1609459200"
        info="The timestamp for which to find the closest block number"
      />

      <NetworkSelector />
    </Form>
  );
}

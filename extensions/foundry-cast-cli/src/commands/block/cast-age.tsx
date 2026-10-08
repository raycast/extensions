import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";
import NetworkSelector from "../../lib/NetworkSelector";

export const CastAge: Command = {
  name: "Block Age",
  description: "Get the timestamp of a block",
  component: Command,
};

const Arguments = {
  blockNumber: { required: false, name: "Block Number" },
} as const;

const successMessage = "Copied timestamp to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("age", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-age" />
          <Action.CopyToClipboard title="Copy timestamp to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="blockNumber"
        title="Block Number"
        placeholder="latest"
        info="This can be a block number or any of the tags: earliest, finalized, safe, latest or pending"
      />

      <NetworkSelector />
    </Form>
  );
}

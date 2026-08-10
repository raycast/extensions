import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const Cast4ByteEvent: Command = {
  name: "4byte Event",
  description: "Get the event signature from a given topic0 from sig.eth.samczsun.com",
  component: Command,
};

const Arguments = {
  topic0: { required: true, name: "Topic 0" },
} as const;

const successMessage = "Copied signatures to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("4byte-decode", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-4byte-event" />
          <Action.CopyToClipboard title="Copy signatures to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="topic0"
        title="Event Topic 0"
        placeholder="0x123412342498718926129841289841294621946898126"
        info="The event topic 0 (selector) to find signatures for"
      />
    </Form>
  );
}

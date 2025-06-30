import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const Cast4ByteDecode: Command = {
  name: "4byte Decode Calldata",
  description: "Decode ABI-encoded calldata using sig.eth.samczsun.com",
  component: Command,
};

const Arguments = {
  calldata: { required: true, name: "Calldata" },
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
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-4byte-decode" />
          <Action.CopyToClipboard title="Copy signatures to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="calldata"
        title="Calldata"
        placeholder="0x123412342498718926129841289841294621946898126"
        info="The calldata to be decoded into function signature and arguments"
      />
    </Form>
  );
}

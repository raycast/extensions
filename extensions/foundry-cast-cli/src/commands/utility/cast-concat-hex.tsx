import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastConcatHex: Command = {
  name: "Concat Hex",
  description: "Concatenate Hex strings",
  component: Command,
};

const Arguments = {
  data: { required: true, name: "Data", flag: "--concat-hex" },
} as const;

const successMessage = "Copied hex data to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast--concat-hex" />
          <Action.CopyToClipboard title="Copy hex data to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="data"
        title="Data"
        placeholder="0xa 0xb 0xc"
        info="The data to concatenate into a hex string"
      />
    </Form>
  );
}

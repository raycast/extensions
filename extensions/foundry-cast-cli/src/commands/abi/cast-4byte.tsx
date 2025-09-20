import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const Cast4Byte: Command = {
  name: "4byte",
  description: "Get the function signatures from the given selector from sig.eth.samczsun.com",
  component: Command,
};

const Arguments = {
  selector: { required: true, name: "Selector" },
} as const;

const successMessage = "Copied signatures to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("4byte", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-4byte" />
          <Action.CopyToClipboard title="Copy signatures to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="selector"
        title="Selector"
        placeholder="0x12341234"
        info="The function selector for which to find signatures"
      />
    </Form>
  );
}

import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastSigEvent: Command = {
  name: "Event Signatures",
  description: "Generate event signatures from event string",
  component: Command,
};

const Arguments = {
  signature: { required: true, name: "Event Signature" },
} as const;

const successMessage = "Copied event selector to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("sig-event", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(v) => execute({ signature: `"${v.signature}"` })} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-sig-event" />
          <Action.CopyToClipboard title="Copy selector to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="signature"
        title="Event signature"
        placeholder="Transfer(address indexed from, address indexed to, uint256 amount)"
        info="The event signature for which you want to find the selector"
      />
    </Form>
  );
}

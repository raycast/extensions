import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import NetworkSelector from "../../lib/NetworkSelector";
import { Command } from "../types";

export const CastCode: Command = {
  name: "Code",
  description: "Get the bytecode of a contract",
  component: Command,
};

const Arguments = {
  address: { required: true, name: "Address" },
} as const;

const successMessage = "Copied bytecode to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("code", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-code" />
          <Action.CopyToClipboard title="Copy bytecode to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Address"
        placeholder="0x4e59b44847b379578588920ca78fbf26c0b4956c"
        info="The account to query the bytecode for"
      />

      <NetworkSelector />
    </Form>
  );
}

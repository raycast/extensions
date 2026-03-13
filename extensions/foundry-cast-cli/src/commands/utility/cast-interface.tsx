import { ActionPanel, Action, Form } from "@raycast/api";

import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastInterface: Command = {
  name: "Interface from ABI",
  description: "Generate a Solidity interface from a given ABI",
  component: Command,
};

const Arguments = {
  address: { required: true, name: "Contract Address" },
  pragma: { required: false, name: "Pragma", flag: "--pragma" },
} as const;

const successMessage = "Copied interface to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("interface", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-interface" />
          <Action.CopyToClipboard title="Copy interface to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Contract Address"
        placeholder="0x4e59b44847b379578588920ca78fbf26c0b4956c"
        info="The contract address for which to generate the interface"
      />
      <Form.Separator />
      <Form.TextField id="pragma" title="Pragma" placeholder="^0.8.10" info="Solidity pragma version" />
    </Form>
  );
}

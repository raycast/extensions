import { ActionPanel, Action, Form } from "@raycast/api";

import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastCreate2: Command = {
  name: "Create2",
  description: "Generate a deterministic contract address using CREATE2",
  component: Command,
};

const Arguments = {
  startsWith: { required: true, name: "Starts with", flag: "--starts-with" },
  endsWith: { required: false, name: "Ends with", flag: "--ends-with" },
  matching: { required: false, name: "Matching", flag: "--matching" },
  caseSensitive: { required: false, name: "Case sensitive", flag: "--case-sensitive", type: "boolean" },
  deployerAddress: { required: false, name: "Deployer address", flag: "--deployer-address" },
  initCode: { required: false, name: "Init code", flag: "--init-code" },
  initCodeHash: { required: false, name: "Init code hash", flag: "--init-code-hash" },
} as const;

const successMessage = "Copied CREATE2 address to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("create2", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-create2" />
          <Action.CopyToClipboard title="Copy CREATE2 address to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="startsWith"
        title="Starts With"
        placeholder="c0ffee"
        info="The hex prefix of the address to be created"
      />
      <Form.Separator />
      <Form.TextField
        id="endsWith"
        title="Ends With"
        placeholder="00"
        info="The hex suffix of the address to be created"
      />
      <Form.TextField
        id="matching"
        title="Matching"
        placeholder="aabb"
        info="Hex sequence that the address has to match"
      />
      <Form.TextField
        id="deployerAddress"
        title="Deployer Address"
        placeholder="0x4e59b44847b379578588920ca78fbf26c0b4956c"
        info="Address of the contract deployer"
      />
      <Form.Checkbox id="caseSensitive" label="Case Sensitive" defaultValue={false} />

      <Form.TextField id="initCode" title="Init Code" placeholder="" info="The init code of the contract" />
      <Form.TextField
        id="initCodeHash"
        title="Init Code Hash"
        placeholder=""
        info="The init code hash of the contract"
      />
    </Form>
  );
}

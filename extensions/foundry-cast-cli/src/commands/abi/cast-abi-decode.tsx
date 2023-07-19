import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastAbiDecode: Command = {
  name: "ABI Decode bytes",
  description: "Decode ABI-encoded input or output data",
  component: Command,
};

const Arguments = {
  sig: { required: true, name: "Signature" },
  data: { required: true, name: "Data" },
} as const;

const successMessage = "Copied decoded values to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("abi-encode", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(v) => execute({ sig: `"${v.sig}"`, data: `"${v.data}"` })} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast--abi-decode" />
          <Action.CopyToClipboard title="Copy decoded values to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="sig"
        title="Function Signature"
        placeholder="balanceOf(address)(uint256)"
        info=" The function signature, in the format `<name>(<in-types>)(<out-types>)`"
      />
      <Form.TextField
        id="data"
        title="Data"
        placeholder="0x00000078388b4ce79068e89bf8aa7f21"
        info="The ABI-encoded output data"
      />
    </Form>
  );
}

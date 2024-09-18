import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastAbiEncode: Command = {
  name: "ABI Encode arguments",
  description: "ABI encode the given function arguments, excluding the selector",
  component: Command,
};

const Arguments = {
  sig: { required: true, name: "Signature" },
  args: { required: true, name: "Arguments" },
} as const;

const successMessage = "Copied encoded value to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("abi-encode", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(v) => execute({ sig: `"${v.sig}"`, args: `"${v.args}"` })} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-abi-encode" />
          <Action.CopyToClipboard title="Copy encoded value to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="sig"
        title="Signature"
        placeholder="someFunction(address,uint256)"
        info="The function signature"
      />
      <Form.TextField id="args" title="Arguments" placeholder="0x1234... 410" info="The arguments of the function" />
    </Form>
  );
}

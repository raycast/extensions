import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastComputeAddress: Command = {
  name: "Compute Address",
  description: "Compute the contract address from a given nonce and deployer address",
  component: Command,
};

const Arguments = {
  address: { required: true, name: "Deployer Address" },
  nonce: { required: false, name: "Nonce" },
} as const;

const successMessage = "Copied contract address to clipboard";
const outputParser = (stdout: string) => stdout.replace("Computed Address: ", "");

export default function Command() {
  const { isLoading, result, execute } = useCast("compute-address", Arguments, { successMessage, outputParser });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser
            title="View Docs"
            url="https://book.getfoundry.sh/reference/cast/cast-compute-address"
          />
          <Action.CopyToClipboard title="Copy contract address to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Deployer address"
        placeholder="0x388C818CA8B9251b393131C08a736A67ccB19297"
        info="The address of the EOA deploying the contract"
      />
      <Form.Separator />
      <Form.TextField
        id="nonce"
        title="Nonce"
        placeholder="0"
        info="The nonce of the deployer address. Defaults to the latest nonce, fetched from the RPC."
      />
    </Form>
  );
}

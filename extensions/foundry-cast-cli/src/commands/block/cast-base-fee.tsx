import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";
import NetworkSelector from "../../lib/NetworkSelector";

export const CastBaseFee: Command = {
  name: "Block Base Fee",
  description: "Get the base fee of a block",
  component: Command,
};

const Arguments = {
  blockNumber: { required: false, name: "Block Number" },
} as const;

const successMessage = "Copied base fee to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("base-fee", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-basefee" />
          <Action.CopyToClipboard title="Copy base fee to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="blockNumber"
        title="Block Number"
        placeholder="latest"
        info="The block number for which to get the base fee. You can also use tags such as earliest, finalized, safe, latest or pending"
      />

      <NetworkSelector />
    </Form>
  );
}

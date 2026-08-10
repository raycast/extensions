import { ActionPanel, Action, Form } from "@raycast/api";
import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastLookupAddress: Command = {
  name: "ENS: Lookup Address",
  description: "Find the ENS name associated with an address",
  component: Command,
};

const Arguments = {
  address: { required: true, name: "Address" },
} as const;

const successMessage = "Copied ENS to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("lookup-address", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-lookup-address" />
          <Action.CopyToClipboard title="Copy ENS to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="address"
        title="Address"
        placeholder="0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990"
        info="The wallet address to query the ENS for"
      />
    </Form>
  );
}

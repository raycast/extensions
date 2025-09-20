import { ActionPanel, Action, Form } from "@raycast/api";

import { useCast } from "../../lib/useCast";
import { Command } from "../types";

export const CastIndex: Command = {
  name: "Index of Mapping Entry",
  description: "Compute the storage slot location for an entry in a mapping",
  component: Command,
};

const Arguments = {
  keyType: { required: true, name: "Key Type" },
  key: { required: true, name: "Key" },
  slotNumber: { required: true, name: "Slot Number" },
} as const;

const successMessage = "Copied storage slot location to clipboard";

export default function Command() {
  const { isLoading, result, execute } = useCast("index", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={execute} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-index" />
          <Action.CopyToClipboard title="Copy storage slot location to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField id="keyType" title="Key Type" placeholder="uint256" info="The mapping key type" />
      <Form.TextField id="key" title="Key" placeholder="3" info="The mapping key" />
      <Form.TextField id="slotNumber" title="Slot Number" placeholder="1" info="The storage slot of the mapping" />
    </Form>
  );
}

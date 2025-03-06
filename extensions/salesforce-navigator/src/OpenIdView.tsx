import * as React from "react";
import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { execSync } from "child_process";

type Org = {
  username: string;
  alias: string;
  orgId: string;
  instanceUrl: string;
};

export default function OpenIdView({ org }: { org: Org }) {
  const [recordId, setRecordId] = useState<string>("");

  async function handleOpenRecord(fields: { recordId: string }) {
    const trimmedRecordId = fields.recordId.trim();
    if (!trimmedRecordId) {
      await showToast({ style: Toast.Style.Failure, title: "Record ID cannot be empty" });
      return;
    }
    try {
      const relativeRecordPath = `/lightning/r/YourObject/${trimmedRecordId}/view`;
      execSync(`sf org open -p "${relativeRecordPath}" --target-org "${org.alias || org.username}"`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to open record", message: errorMessage });
    }
  }

  return (
    <Form
      navigationTitle="Open Record by ID"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open Record" onSubmit={handleOpenRecord} icon={Icon.Link} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="recordId"
        title="Salesforce Record ID"
        placeholder="Enter a record ID"
        value={recordId}
        onChange={setRecordId}
      />
    </Form>
  );
}

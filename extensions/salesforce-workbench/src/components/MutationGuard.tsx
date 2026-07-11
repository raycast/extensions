import { Action, ActionPanel, Alert, Form, Icon, confirmAlert, useNavigation } from "@raycast/api";
import { useState } from "react";
import { isProduction } from "../orgs";
import { SalesforceOrg } from "../types";

export interface MutationGuardRequest {
  org: SalesforceOrg;
  action: "create" | "update" | "delete";
  objectApiName: string;
  recordId?: string;
  changes?: Record<string, unknown>;
  execute: () => Promise<void>;
}

export function useMutationGuard(): (request: MutationGuardRequest) => Promise<void> {
  const { push } = useNavigation();
  return async (request) => {
    if (isProduction(request.org)) {
      push(<ProductionConfirmation request={request} />);
      return;
    }
    if (request.action === "delete") {
      const confirmed = await confirmAlert({
        title: `Delete ${request.objectApiName} record?`,
        message: request.recordId,
        primaryAction: { title: "Delete Record", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    await request.execute();
  };
}

function ProductionConfirmation({ request }: { request: MutationGuardRequest }) {
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const { pop } = useNavigation();
  const preview = JSON.stringify(
    {
      environment: "PRODUCTION",
      org: request.org.alias,
      action: request.action,
      object: request.objectApiName,
      recordId: request.recordId,
      changes: request.changes,
    },
    null,
    2,
  );

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Confirm Production ${request.action}`}
            icon={Icon.Warning}
            onSubmit={async () => {
              if (confirmation !== "PRODUCTION") return;
              setSubmitting(true);
              try {
                await request.execute();
              } finally {
                setSubmitting(false);
              }
            }}
          />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Production Safety Gate"
        text="This operation changes Production data. Review the preview and type PRODUCTION exactly to continue."
      />
      <Form.TextArea id="preview" title="Change Preview" value={preview} onChange={() => undefined} />
      <Form.TextField
        id="confirmation"
        title="Type PRODUCTION"
        value={confirmation}
        error={confirmation && confirmation !== "PRODUCTION" ? "Type PRODUCTION exactly." : undefined}
        onChange={setConfirmation}
      />
    </Form>
  );
}

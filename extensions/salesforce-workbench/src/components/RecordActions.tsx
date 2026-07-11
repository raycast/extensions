import { Action, ActionPanel, Icon, Toast, showToast } from "@raycast/api";
import { recordsToCsv } from "../format";
import { addMutationHistory } from "../storage";
import { deleteRecord, describeObject, getRecord, openRecord } from "../salesforce";
import { SalesforceOrg, SalesforceRecord } from "../types";
import { DynamicRecordForm } from "./DynamicRecordForm";
import { useMutationGuard } from "./MutationGuard";

export function RecordActions({
  org,
  record,
  onDeleted,
  extraActions,
}: {
  org: SalesforceOrg;
  record: SalesforceRecord;
  onDeleted?: () => void;
  extraActions?: React.ReactNode;
}) {
  const objectApiName = record.attributes?.type;
  const recordId = record.Id;
  const guardMutation = useMutationGuard();

  const deleteAction = async () => {
    if (!objectApiName || !recordId) return;
    await guardMutation({
      org,
      action: "delete",
      objectApiName,
      recordId,
      execute: async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting record…" });
        let before: SalesforceRecord | null = record;
        try {
          const describe = await describeObject(org, objectApiName);
          if (!describe.deletable) throw new Error(`${objectApiName} is not deletable for this user.`);
          before = await getRecord(org, objectApiName, recordId).catch(() => record);
          await deleteRecord(org, objectApiName, recordId);
          await addMutationHistory({
            timestamp: new Date().toISOString(),
            orgId: org.orgId,
            orgAlias: org.alias,
            action: "delete",
            objectApiName,
            recordId,
            before,
            after: null,
            success: true,
          });
          toast.style = Toast.Style.Success;
          toast.title = "Record deleted";
          onDeleted?.();
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : String(caught);
          await addMutationHistory({
            timestamp: new Date().toISOString(),
            orgId: org.orgId,
            orgAlias: org.alias,
            action: "delete",
            objectApiName,
            recordId,
            before,
            after: null,
            success: false,
            error: message,
          });
          toast.style = Toast.Style.Failure;
          toast.title = "Unable to delete record";
          toast.message = message;
        }
      },
    });
  };

  return (
    <ActionPanel>
      {objectApiName && recordId ? (
        <Action
          title="Open Record in Salesforce"
          icon={Icon.Globe}
          onAction={async () => {
            try {
              await openRecord(org, objectApiName, recordId);
            } catch (caught) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Unable to open record",
                message: caught instanceof Error ? caught.message : String(caught),
              });
            }
          }}
        />
      ) : null}
      {objectApiName && recordId ? (
        <Action.Push
          title="Edit Record"
          icon={Icon.Pencil}
          target={
            <DynamicRecordForm
              org={org}
              objectApiName={objectApiName}
              mode="update"
              recordId={recordId}
              initialRecord={record}
            />
          }
        />
      ) : null}
      {recordId ? <Action.CopyToClipboard title="Copy Record ID" content={recordId} /> : null}
      <Action.CopyToClipboard title="Copy Record JSON" content={JSON.stringify(record, null, 2)} />
      <Action.CopyToClipboard title="Copy Record as CSV" content={recordsToCsv([record])} />
      {extraActions}
      {objectApiName && recordId ? (
        <Action
          title={org.isSandbox ? "Delete Record" : "Delete Record from Production"}
          icon={Icon.Trash}
          onAction={deleteAction}
        />
      ) : null}
    </ActionPanel>
  );
}

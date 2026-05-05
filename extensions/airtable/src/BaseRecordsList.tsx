import { Action, ActionPanel, Form, Icon, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { fetchBaseRecords, updateBaseRecord } from "./metadata-api";
import { AirtableRecord, Field } from "./types";
import { Fragment } from "react/jsx-runtime";
import { useState } from "react";

export function AirtableBaseRecordsList(props: { baseId: string; tableId: string; fields: Field[] }) {
  const { baseId, tableId } = props;
  const {
    isLoading,
    data: records,
    revalidate,
  } = useCachedPromise(async () => await fetchBaseRecords(props.baseId, props.tableId), [], {
    initialData: [],
    onError(error) {
      if (error.message.includes("Invalid permissions")) {
        showFailureToast(
          `You need the "data.records:read" and "data.records:write" scopes to manage records. Please re-authenticate.`,
          {
            title: "Missing Scopes",
            primaryAction: {
              title: "Re-authenticate",
              async onAction(toast) {
                await openExtensionPreferences();
                await toast.hide();
              },
            },
          },
        );
      } else showFailureToast(error);
    },
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {records.map((record, recordIndex) => (
        <List.Item
          key={record.id}
          title={recordIndex.toString()}
          detail={
            <List.Item.Detail
              markdown={`| key | val |
|------|-----|
${Object.entries(record.fields)
  .map(([key, val]) => `| ${key} | ${val instanceof Array ? val.join(", ") : String(val)} |`)
  .join(`\n`)}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                title="Update Record"
                target={
                  <UpdateRecord
                    record={record}
                    baseId={baseId}
                    tableId={tableId}
                    fields={props.fields}
                    onUpdate={revalidate}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UpdateRecord(props: {
  baseId: string;
  tableId: string;
  record: AirtableRecord;
  fields: Field[];
  onUpdate: () => void;
}) {
  const { baseId, tableId, record, fields, onUpdate } = props;
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const stringFieldKeys = fields
    .filter((field) => field.type === "singleLineText" || field.type === "multilineText")
    .map((field) => field.name);
  const onlyStrings = Object.fromEntries(
    Object.entries(record.fields).filter(([key]) => stringFieldKeys.includes(key)),
  ) as Record<string, string>; // only get the string fields of a record

  const { handleSubmit, itemProps } = useForm<Record<string, string>>({
    async onSubmit(values) {
      try {
        setIsLoading(true);
        await updateBaseRecord(baseId, tableId, record.id, values);
        onUpdate();
        pop();
      } catch (error) {
        await showFailureToast(error);
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: onlyStrings,
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Update Record" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {fields.map((field) => {
        const common = {
          title: field.name,
          placholder: field.name,
        };
        return (
          <Fragment key={field.id}>
            {field.type === "singleLineText" ? (
              <Form.TextField {...common} {...itemProps[field.name]} />
            ) : field.type === "multilineText" ? (
              <Form.TextArea {...common} {...itemProps[field.name]} />
            ) : (
              <Form.Description title={field.name} text={`${field.type} NOT SUPPORTED`} />
            )}
          </Fragment>
        );
      })}
    </Form>
  );
}

import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { addMutationHistory } from "../storage";
import { createRecord, describeObject, getRecord, updateRecord } from "../salesforce";
import { DescribeField, DescribeResult, SalesforceOrg, SalesforceRecord } from "../types";
import { ErrorView } from "./ErrorView";
import { useMutationGuard } from "./MutationGuard";

const SUPPORTED_TYPES = new Set([
  "boolean",
  "currency",
  "date",
  "datetime",
  "double",
  "email",
  "int",
  "multipicklist",
  "percent",
  "phone",
  "picklist",
  "reference",
  "string",
  "textarea",
  "url",
]);

export function DynamicRecordForm({
  org,
  objectApiName,
  mode,
  recordId,
  initialRecord,
}: {
  org: SalesforceOrg;
  objectApiName: string;
  mode: "create" | "update";
  recordId?: string;
  initialRecord?: SalesforceRecord;
}) {
  const [describe, setDescribe] = useState<DescribeResult>();
  const [before, setBefore] = useState<SalesforceRecord | null>(initialRecord ?? null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [clearFields, setClearFields] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const guardMutation = useMutationGuard();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const metadata = await describeObject(org, objectApiName);
        if (cancelled) return;
        setDescribe(metadata);
        let record = initialRecord ?? null;
        if (mode === "update" && recordId && !record) record = await getRecord(org, objectApiName, recordId);
        if (cancelled) return;
        setBefore(record);
        const editable = editableFields(metadata, mode);
        const initialSelection =
          mode === "create"
            ? editable
                .filter(
                  (field) =>
                    (!field.nillable && !field.defaultedOnCreate) ||
                    ["Name", "FirstName", "LastName", "Subject", "Status", "StageName", "CloseDate"].includes(
                      field.name,
                    ),
                )
                .map((field) => field.name)
            : [];
        setSelectedFields(Array.from(new Set(initialSelection)));
        if (record) {
          setValues(
            Object.fromEntries(
              editable.map((field) => [field.name, normalizeInitialValue(field, record?.[field.name])]),
            ),
          );
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [org.orgId, objectApiName, mode, recordId, initialRecord]);

  const fields = useMemo(() => (describe ? editableFields(describe, mode) : []), [describe, mode]);
  if (error) return <ErrorView title={`Unable to load ${objectApiName}`} error={error} />;

  const submit = async () => {
    if (!describe) return;
    let payload: Record<string, unknown>;
    try {
      payload = buildPayload(fields, selectedFields, clearFields, values, mode);
    } catch (caught) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check the record fields",
        message: caught instanceof Error ? caught.message : String(caught),
      });
      return;
    }
    if (!Object.keys(payload).length) {
      await showToast({ style: Toast.Style.Failure, title: "Choose at least one field" });
      return;
    }

    await guardMutation({
      org,
      action: mode,
      objectApiName,
      recordId,
      changes: payload,
      execute: async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `${mode === "create" ? "Creating" : "Updating"} record…`,
        });
        let finalId = recordId;
        try {
          if (mode === "create") {
            if (!describe.createable) throw new Error(`${objectApiName} is not createable for this user.`);
            const response = await createRecord(org, objectApiName, payload);
            finalId = response.id;
          } else {
            if (!describe.updateable) throw new Error(`${objectApiName} is not updateable for this user.`);
            if (!recordId) throw new Error("Record ID is required for updates.");
            await updateRecord(org, objectApiName, recordId, payload);
          }
          const after = finalId
            ? await getRecord(org, objectApiName, finalId).catch(() => ({ Id: finalId, ...payload }))
            : payload;
          await addMutationHistory({
            timestamp: new Date().toISOString(),
            orgId: org.orgId,
            orgAlias: org.alias,
            action: mode,
            objectApiName,
            recordId: finalId,
            before,
            after,
            success: true,
          });
          toast.style = Toast.Style.Success;
          toast.title = `Record ${mode === "create" ? "created" : "updated"}`;
          toast.message = finalId;
          await popToRoot();
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : String(caught);
          await addMutationHistory({
            timestamp: new Date().toISOString(),
            orgId: org.orgId,
            orgAlias: org.alias,
            action: mode,
            objectApiName,
            recordId: finalId,
            before,
            after: null,
            success: false,
            error: message,
          });
          toast.style = Toast.Style.Failure;
          toast.title = `Unable to ${mode} record`;
          toast.message = message;
        }
      },
    });
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`${mode === "create" ? "Create" : "Edit"} ${describe?.label ?? objectApiName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`${mode === "create" ? "Create" : "Update"} ${describe?.label ?? objectApiName}`}
            icon={mode === "create" ? Icon.Plus : Icon.Pencil}
            onSubmit={submit}
          />
          <Action
            title="Refresh Object Metadata"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              setLoading(true);
              try {
                setDescribe(await describeObject(org, objectApiName, true));
              } finally {
                setLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={org.isSandbox ? `Sandbox: ${org.alias}` : `PRODUCTION: ${org.alias}`}
        text={
          org.isSandbox
            ? `Changes are sent as ${org.username}.`
            : "Every Production mutation requires typing PRODUCTION on a separate confirmation screen."
        }
      />
      <Form.TagPicker id="selectedFields" title="Fields to Include" value={selectedFields} onChange={setSelectedFields}>
        {fields.map((field) => (
          <Form.TagPicker.Item key={field.name} value={field.name} title={`${field.label} (${field.name})`} />
        ))}
      </Form.TagPicker>
      {mode === "update" ? (
        <Form.TagPicker id="clearFields" title="Fields to Clear" value={clearFields} onChange={setClearFields}>
          {fields
            .filter((field) => field.nillable)
            .map((field) => (
              <Form.TagPicker.Item key={field.name} value={field.name} title={`${field.label} (${field.name})`} />
            ))}
        </Form.TagPicker>
      ) : null}
      {fields
        .filter((field) => selectedFields.includes(field.name) && !clearFields.includes(field.name))
        .map((field) => (
          <DynamicField
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
          />
        ))}
    </Form>
  );
}

export function editableFields(describe: DescribeResult, mode: "create" | "update"): DescribeField[] {
  return describe.fields
    .filter((field) => (mode === "create" ? field.createable : field.updateable))
    .filter((field) => !field.calculated && SUPPORTED_TYPES.has(field.type))
    .sort((a, b) => Number(a.nillable) - Number(b.nillable) || a.label.localeCompare(b.label));
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: DescribeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const title = `${field.label}${!field.nillable ? " *" : ""}`;
  if (field.type === "boolean") {
    return (
      <Form.Checkbox id={field.name} title={title} label={field.name} value={Boolean(value)} onChange={onChange} />
    );
  }
  if (field.type === "picklist") {
    return (
      <Form.Dropdown
        id={field.name}
        title={title}
        value={typeof value === "string" ? value : "__NONE__"}
        onChange={onChange}
      >
        {field.nillable ? <Form.Dropdown.Item value="__NONE__" title="None" /> : null}
        {(field.picklistValues ?? [])
          .filter((option) => option.active)
          .map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
          ))}
      </Form.Dropdown>
    );
  }
  if (field.type === "multipicklist") {
    return (
      <Form.TagPicker
        id={field.name}
        title={title}
        value={Array.isArray(value) ? (value as string[]) : []}
        onChange={onChange}
      >
        {(field.picklistValues ?? [])
          .filter((option) => option.active)
          .map((option) => (
            <Form.TagPicker.Item key={option.value} value={option.value} title={option.label} />
          ))}
      </Form.TagPicker>
    );
  }
  if (field.type === "textarea") {
    return <Form.TextArea id={field.name} title={title} value={String(value ?? "")} onChange={onChange} />;
  }
  if (field.type === "date" || field.type === "datetime") {
    return (
      <Form.DatePicker
        id={field.name}
        title={title}
        type={field.type === "date" ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
        value={value instanceof Date ? value : null}
        onChange={onChange}
      />
    );
  }
  const placeholder =
    field.type === "reference"
      ? `Salesforce ID${field.referenceTo?.length ? ` (${field.referenceTo.join(", ")})` : ""}`
      : undefined;
  return (
    <Form.TextField
      id={field.name}
      title={title}
      placeholder={placeholder}
      value={String(value ?? "")}
      onChange={onChange}
    />
  );
}

export function buildPayload(
  fields: DescribeField[],
  selectedFields: string[],
  clearFields: string[],
  values: Record<string, unknown>,
  mode: "create" | "update",
): Record<string, unknown> {
  const byName = new Map(fields.map((field) => [field.name, field]));
  const payload: Record<string, unknown> = {};
  for (const name of selectedFields) {
    if (clearFields.includes(name)) continue;
    const field = byName.get(name);
    if (!field) throw new Error(`Field ${name} is not editable.`);
    const value = serializeFieldValue(field, values[name]);
    if (mode === "create" && !field.nillable && !field.defaultedOnCreate && (value === "" || value === undefined)) {
      throw new Error(`${field.label} is required.`);
    }
    if (value !== undefined) payload[name] = value;
  }
  for (const name of clearFields) {
    const field = byName.get(name);
    if (!field?.nillable) throw new Error(`${field?.label ?? name} cannot be cleared.`);
    payload[name] = null;
  }
  return payload;
}

function serializeFieldValue(field: DescribeField, value: unknown): unknown {
  if (value === "__NONE__") return undefined;
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "multipicklist") return Array.isArray(value) ? value.join(";") : "";
  if (field.type === "date" && value instanceof Date) return value.toISOString().slice(0, 10);
  if (field.type === "datetime" && value instanceof Date) return value.toISOString();
  if (["currency", "double", "int", "percent"].includes(field.type)) {
    if (value === "" || value === undefined || value === null) return undefined;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${field.label} must be a number.`);
    return field.type === "int" ? Math.trunc(number) : number;
  }
  const text = value === undefined || value === null ? "" : String(value);
  if (field.length && text.length > field.length)
    throw new Error(`${field.label} must be ${field.length} characters or fewer.`);
  return text;
}

function normalizeInitialValue(field: DescribeField, value: unknown): unknown {
  if (value === null || value === undefined) return field.type === "boolean" ? false : "";
  if (field.type === "multipicklist") return String(value).split(";").filter(Boolean);
  if ((field.type === "date" || field.type === "datetime") && typeof value === "string") return new Date(value);
  return value;
}

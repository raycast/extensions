import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  LocalStorage,
  PopToRootType,
  Toast,
  closeMainWindow,
  getSelectedText,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Collection,
  Field,
  SpinalError,
  clearCache,
  clearResourceCache,
  createResource,
  defaultCollectionKey,
  errorMessage,
  errorTitle,
  fetchCollections,
  lastCollectionKey,
  toSpinalError,
} from "./spinal";

type FieldPrimitive = string | number | boolean | Date | string[];

interface LaunchContext {
  collectionId?: string;
  body?: string;
}

interface SubmitValues {
  collectionId: string;
  body: string;
  publishDate?: Date;
  [fieldValueId: string]: FieldPrimitive | undefined;
}

interface ValidationIssue {
  field: string;
  message: string;
}

const mappableFieldTypes = new Set([
  "string",
  "text",
  "number",
  "boolean",
  "datetime",
  "select",
  "multi_select",
]);

function fieldValueId(collectionId: string, fieldKey: string): string {
  return `fieldValues.${collectionId}.${fieldKey}`;
}

function mappableFields(collection: Collection): Field[] {
  return collection.fields.filter(
    (field) => mappableFieldTypes.has(field.field_type) && !field.read_only,
  );
}

function humanizeKey(key: string): string {
  return key
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function fieldLabel(field: Field): string {
  return field.label?.trim() || humanizeKey(field.key);
}

function formatStrftimeLike(pattern: string, now: Date): string | undefined {
  const pad = (value: number) => String(value).padStart(2, "0");

  const formatted = pattern
    .replace(/%Y/g, String(now.getFullYear()))
    .replace(/%m/g, pad(now.getMonth() + 1))
    .replace(/%d/g, pad(now.getDate()))
    .replace(/%H/g, pad(now.getHours()))
    .replace(/%M/g, pad(now.getMinutes()));

  return formatted.includes("%") ? undefined : formatted;
}

function fieldDefaultValue(field: Field): string | undefined {
  if (!field.default) return undefined;

  const rawDefaultValue = field.default_value;

  if (!rawDefaultValue) return undefined;

  if (field.field_type === "datetime" && rawDefaultValue.includes("%")) {
    return formatStrftimeLike(rawDefaultValue, new Date());
  }

  return rawDefaultValue;
}

function serializeFieldValue(
  field: Field,
  rawValue: FieldPrimitive | undefined,
): string | undefined {
  if (rawValue === undefined || rawValue === null || rawValue === "")
    return undefined;

  switch (field.field_type) {
    case "string":
    case "text":
    case "select":
      return String(rawValue);
    case "number": {
      const value = String(rawValue).trim();

      return value !== "" && !isNaN(Number(value)) ? value : undefined;
    }
    case "boolean":
      return String(Boolean(rawValue));
    case "datetime": {
      if (!(rawValue instanceof Date) || isNaN(rawValue.getTime()))
        return undefined;

      return rawValue.toISOString();
    }
    case "multi_select": {
      if (!Array.isArray(rawValue) || rawValue.length === 0) return undefined;

      return JSON.stringify(rawValue.map(String));
    }
    default:
      return undefined;
  }
}

function validationIssues(
  collection: Collection,
  values: SubmitValues,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of mappableFields(collection)) {
    const rawValue = values[fieldValueId(collection.id, field.key)];
    const serialized = serializeFieldValue(field, rawValue);

    if (field.required && serialized === undefined) {
      issues.push({
        field: field.key,
        message:
          field.field_type === "number" &&
          typeof rawValue === "string" &&
          rawValue.trim() !== ""
            ? `${fieldLabel(field)} must be a number`
            : `${fieldLabel(field)} is required`,
      });
    }

    if (
      field.min_length &&
      typeof rawValue === "string" &&
      rawValue.length < field.min_length
    ) {
      issues.push({
        field: field.key,
        message: `${fieldLabel(field)} must be at least ${field.min_length} characters`,
      });
    }

    if (
      field.max_length &&
      typeof rawValue === "string" &&
      rawValue.length > field.max_length
    ) {
      issues.push({
        field: field.key,
        message: `${fieldLabel(field)} must be at most ${field.max_length} characters`,
      });
    }
  }

  return issues;
}

function fieldSelectOptions(field: Field): string[] {
  return field.allowed_values ?? [];
}

function FieldControl({
  collectionId,
  field,
}: {
  collectionId: string;
  field: Field;
}) {
  const id = fieldValueId(collectionId, field.key);
  const label = fieldLabel(field);
  const placeholder = field.description || undefined;
  const defaultValue = fieldDefaultValue(field);

  switch (field.field_type) {
    case "string":
      return (
        <Form.TextField
          id={id}
          title={label}
          placeholder={placeholder}
          defaultValue={defaultValue}
        />
      );
    case "text":
      return (
        <Form.TextArea
          id={id}
          title={label}
          placeholder={placeholder}
          defaultValue={defaultValue}
        />
      );
    case "number":
      return (
        <Form.TextField
          id={id}
          title={label}
          placeholder={placeholder ?? "A number"}
          defaultValue={defaultValue}
        />
      );
    case "boolean":
      return (
        <Form.Checkbox
          id={id}
          label={label}
          defaultValue={defaultValue === "true"}
        />
      );
    case "datetime":
      return (
        <Form.DatePicker
          id={id}
          title={label}
          type={Form.DatePicker.Type.DateTime}
          defaultValue={defaultValue ? new Date(defaultValue) : undefined}
        />
      );
    case "select":
      return (
        <Form.Dropdown id={id} title={label} defaultValue={defaultValue}>
          {!field.required && !defaultValue ? (
            <Form.Dropdown.Item value="" title="None" />
          ) : null}
          {fieldSelectOptions(field).map((option) => (
            <Form.Dropdown.Item key={option} value={option} title={option} />
          ))}
        </Form.Dropdown>
      );
    case "multi_select": {
      let preselected: string[] = [];

      if (defaultValue) {
        try {
          const parsed = JSON.parse(defaultValue);

          preselected = Array.isArray(parsed)
            ? parsed.map(String)
            : [String(defaultValue)];
        } catch {
          preselected = [defaultValue];
        }
      }

      return (
        <Form.TagPicker id={id} title={label} defaultValue={preselected}>
          {fieldSelectOptions(field).map((option) => (
            <Form.TagPicker.Item key={option} value={option} title={option} />
          ))}
        </Form.TagPicker>
      );
    }
    default:
      return <Fragment />;
  }
}

export default function Command(props: LaunchProps) {
  const { collectionId: launchedCollectionId, body: launchedBody } =
    (props.launchContext ?? {}) as LaunchContext;

  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [selectedBody, setSelectedBody] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<SpinalError>();
  const [reloadKey, setReloadKey] = useState(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    const selectionPromise = launchedBody
      ? undefined
      : getSelectedText()
          .then((selection) =>
            selection.trim() ? selection.trim() : undefined,
          )
          .catch(() => undefined);

    (async () => {
      try {
        const result = await fetchCollections();
        const storedDefault =
          await LocalStorage.getItem<string>(defaultCollectionKey);
        const lastUsed = await LocalStorage.getItem<string>(lastCollectionKey);
        const candidates = [launchedCollectionId, storedDefault, lastUsed]
          .filter((id): id is string => Boolean(id))
          .filter((id) => result.some((collection) => collection.id === id));

        setCollections(result);
        setSelectedCollectionId(candidates[0] ?? result[0]?.id);
        setSelectedBody(await selectionPromise);
      } catch (error) {
        setLoadError(toSpinalError(error));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [launchedCollectionId, launchedBody, reloadKey]);

  if (loadError) {
    const guidance =
      loadError.status === 401
        ? "Check your API key in the extension settings. Create one in Spinal under Settings > API."
        : loadError.status === 402
          ? "Your Spinal plan does not include API access."
          : undefined;

    return (
      <Detail
        markdown={`## ${errorTitle(loadError)}\n\n${errorMessage(loadError)}${
          guidance ? `\n\n${guidance}` : ""
        }`}
      />
    );
  }

  const selected = collections.find(
    (collection) => collection.id === selectedCollectionId,
  );

  async function submitResource(values: SubmitValues) {
    const target = collections.find(
      (collection) => collection.id === values.collectionId,
    );

    if (!target || submittingRef.current) return;

    const issues = validationIssues(target, values);

    if (issues.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation failed",
        message: issues.map((issue) => issue.message).join("\n"),
      });

      return;
    }

    const fieldValues: Record<string, string> = {};

    for (const field of mappableFields(target)) {
      const value = serializeFieldValue(
        field,
        values[fieldValueId(target.id, field.key)],
      );

      if (value !== undefined) fieldValues[field.key] = value;
    }

    submittingRef.current = true;
    setSubmitting(true);

    const progressToast = await showToast({
      style: Toast.Style.Animated,
      title: values.publishDate ? "Scheduling resource…" : "Creating draft…",
    });

    try {
      await createResource(target.id, {
        ...(values.body.trim() ? { body: values.body } : {}),
        published_at: values.publishDate?.toISOString(),
        field_values: fieldValues,
      });
      await LocalStorage.setItem(lastCollectionKey, target.id);
      clearResourceCache(target.id);
      await progressToast.hide();
      await closeMainWindow({ popToRootType: PopToRootType.Immediate }).catch(
        () => undefined,
      );
      await showHUD(
        values.publishDate
          ? `Scheduled for ${values.publishDate.toLocaleString()}`
          : "Draft created",
      );
    } catch (error) {
      await progressToast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: errorTitle(error),
        message: errorMessage(error),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function setDefaultCollection() {
    if (!selected) return;

    await LocalStorage.setItem(defaultCollectionKey, selected.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Default collection set",
      message: selected.name,
    });
  }

  async function resetCachedData() {
    clearCache();
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  if (isLoading) {
    return (
      <Detail
        isLoading
        markdown="Fetching collections…"
        actions={
          <ActionPanel>
            <Action
              title="Update API Key"
              icon={Icon.Key}
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.PlusSquare}
            title="Create Resource"
            onSubmit={submitResource}
          />
          <ActionPanel.Section title="Configuration">
            <Action
              title="Set Current Collection as Default"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={setDefaultCollection}
            />
            <Action
              title="Update API Key"
              icon={Icon.Key}
              onAction={() => openExtensionPreferences()}
            />
            <Action
              title="Reset Cached Data"
              icon={Icon.ArrowClockwise}
              onAction={resetCachedData}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="collectionId"
        title="Collection"
        defaultValue={selectedCollectionId}
        onChange={(value) => setSelectedCollectionId(value)}
      >
        {collections.map((collection) => (
          <Form.Dropdown.Item
            key={collection.id}
            value={collection.id}
            title={collection.name}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="body"
        title="Body"
        placeholder="Plain markdown, no frontmatter"
        defaultValue={launchedBody ?? selectedBody}
      />

      <Form.Separator />

      <Form.DatePicker
        id="publishDate"
        title="Publish Date"
        type={Form.DatePicker.Type.DateTime}
      />

      <Form.Separator />

      <Form.Description title="Frontmatter" text="" />

      {selected
        ? mappableFields(selected).map((field) => (
            <FieldControl
              key={`${selected.id}.${field.key}`}
              collectionId={selected.id}
              field={field}
            />
          ))
        : null}
    </Form>
  );
}

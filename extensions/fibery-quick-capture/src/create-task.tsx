import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LocalStorage,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CaptureDatabase, CaptureField, FiberyClient, FiberyPreferences, RelationOption } from "./fibery";

const LAST_DATABASE_KEY = "last-database";

interface FormValues {
  title: string;
  database: string;
  enabledFields: string[];
  [key: string]: unknown;
}

function fieldLabel(field: string): string {
  const name = field.split("/").at(-1) ?? field;
  return name ? `${name[0].toLocaleUpperCase()}${name.slice(1)}` : name;
}

function additionalFieldId(field: string): string {
  return `additional:${field}`;
}

function databaseLabel(database: string): string {
  return database.replace("/", " › ");
}

function requiredInfo(field: CaptureField): string | undefined {
  return field.required ? "Required in Fibery" : undefined;
}

function buildAdditionalFields(values: FormValues, fields: CaptureField[]): Record<string, unknown> {
  const entity: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = values[additionalFieldId(field.name)];
    if (field.kind === "relation-collection") continue;

    if (field.kind === "date" || field.kind === "date-time") {
      if (!(rawValue instanceof Date)) continue;
      if (field.kind === "date-time") {
        entity[field.name] = rawValue.toISOString();
      } else {
        const year = rawValue.getFullYear();
        const month = String(rawValue.getMonth() + 1).padStart(2, "0");
        const day = String(rawValue.getDate()).padStart(2, "0");
        entity[field.name] = `${year}-${month}-${day}`;
      }
      continue;
    }

    if (typeof rawValue !== "string" || rawValue === "__unset" || !rawValue.trim()) continue;
    const trimmed = rawValue.trim();

    if (field.kind === "integer") {
      const value = Number(trimmed);
      if (!Number.isInteger(value)) throw new Error(`${fieldLabel(field.name)} must be a whole number.`);
      entity[field.name] = value;
    } else if (field.kind === "decimal") {
      if (!Number.isFinite(Number(trimmed))) throw new Error(`${fieldLabel(field.name)} must be a number.`);
      entity[field.name] = trimmed;
    } else if (field.kind === "boolean") {
      entity[field.name] = trimmed === "true";
    } else if (field.kind === "location") {
      entity[field.name] = { fullAddress: trimmed };
    } else if (field.kind === "relation") {
      entity[field.name] = { "fibery/id": trimmed };
    } else {
      entity[field.name] = trimmed;
    }
  }

  return entity;
}

function buildCollectionFields(values: FormValues, fields: CaptureField[]): Record<string, string[]> {
  return Object.fromEntries(
    fields
      .filter((field) => field.kind === "relation-collection")
      .map((field) => {
        const rawValue = values[additionalFieldId(field.name)];
        return [
          field.name,
          Array.isArray(rawValue) ? rawValue.filter((value): value is string => typeof value === "string") : [],
        ];
      })
      .filter(([, entityIds]) => entityIds.length > 0),
  );
}

export default function CreateTaskCommand() {
  const preferences = getPreferenceValues<FiberyPreferences>();
  const client = useMemo(() => new FiberyClient(preferences), [preferences.apiToken, preferences.workspace]);
  const [databases, setDatabases] = useState<CaptureDatabase[]>([]);
  const [database, setDatabase] = useState("");
  const [enabledFields, setEnabledFields] = useState<string[]>([]);
  const [relationOptions, setRelationOptions] = useState<Record<string, RelationOption[]>>({});
  const [loadingRelationFields, setLoadingRelationFields] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const selectedDatabase = databases.find((item) => item.name === database);

  const loadSchema = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const [availableDatabases, storedDatabase] = await Promise.all([
        client.getCaptureDatabases(),
        LocalStorage.getItem<string>(LAST_DATABASE_KEY),
      ]);

      if (availableDatabases.length === 0) {
        setError("No Fibery databases with a writable text field were found.");
        setDatabases([]);
        return;
      }

      const initialDatabase = availableDatabases.find((item) => item.name === storedDatabase) ?? availableDatabases[0];
      const initialTitleField = initialDatabase.taskNameField;

      setDatabases(availableDatabases);
      setDatabase(initialDatabase.name);
      setEnabledFields(
        initialDatabase.fields
          .filter((field) => field.required && field.name !== initialTitleField)
          .map((field) => field.name),
      );
      setRelationOptions({});
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load the Fibery schema.");
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadSchema();
  }, [loadSchema]);

  function handleDatabaseChange(nextDatabase: string) {
    const next = databases.find((item) => item.name === nextDatabase);
    const nextTitleField = next?.taskNameField ?? "";
    setDatabase(nextDatabase);
    setEnabledFields(
      next?.fields.filter((field) => field.required && field.name !== nextTitleField).map((field) => field.name) ?? [],
    );
    setRelationOptions({});
  }

  async function handleSubmit(values: FormValues) {
    const title = values.title.trim();
    if (!title) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a task title" });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving task to Fibery…" });

    try {
      const taskNameField = selectedDatabase?.taskNameField;
      if (!taskNameField) throw new Error("The selected database has no writable Name field.");

      const selectedFields =
        selectedDatabase?.fields.filter(
          (field) => enabledFields.includes(field.name) && field.name !== taskNameField,
        ) ?? [];
      const additionalFields = buildAdditionalFields(values, selectedFields);
      const collectionFields = buildCollectionFields(values, selectedFields);
      const missingRequiredField = selectedFields.find(
        (field) =>
          field.required &&
          additionalFields[field.name] === undefined &&
          (collectionFields[field.name]?.length ?? 0) === 0,
      );
      if (missingRequiredField) throw new Error(`${fieldLabel(missingRequiredField.name)} is required.`);

      const createdTask = await client.createTask(values.database, taskNameField, title, additionalFields);
      for (const [field, entityIds] of Object.entries(collectionFields)) {
        try {
          await client.addCollectionItems(values.database, field, createdTask["fibery/id"], entityIds);
        } catch (caughtError) {
          throw new Error(
            `The task was created, but ${fieldLabel(field)} could not be added. ${
              caughtError instanceof Error ? caughtError.message : ""
            }`.trim(),
          );
        }
      }
      await LocalStorage.setItem(LAST_DATABASE_KEY, values.database);
      toast.hide();
      await popToRoot({ clearSearchBar: true });
      await showHUD(`Task saved to ${databaseLabel(values.database)}`);
    } catch (caughtError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not save task";
      toast.message = caughtError instanceof Error ? caughtError.message : "Fibery could not complete the request.";
    } finally {
      setIsSubmitting(false);
    }
  }

  const loadRelationOptions = useCallback(
    async (field: CaptureField) => {
      setLoadingRelationFields((current) => ({ ...current, [field.name]: true }));
      try {
        const options = await client.getRelationOptions(field);
        setRelationOptions((current) => ({ ...current, [field.name]: options }));
      } catch (caughtError) {
        setRelationOptions((current) => ({ ...current, [field.name]: [] }));
        await showToast({
          style: Toast.Style.Failure,
          title: `Could not load ${fieldLabel(field.name)}`,
          message: caughtError instanceof Error ? caughtError.message : "Fibery could not load the field options.",
        });
      } finally {
        setLoadingRelationFields((current) => ({ ...current, [field.name]: false }));
      }
    },
    [client],
  );

  useEffect(() => {
    for (const field of selectedDatabase?.fields ?? []) {
      if (
        (field.kind === "relation" || field.kind === "relation-collection") &&
        enabledFields.includes(field.name) &&
        relationOptions[field.name] === undefined &&
        !loadingRelationFields[field.name]
      ) {
        void loadRelationOptions(field);
      }
    }
  }, [enabledFields, loadRelationOptions, loadingRelationFields, relationOptions, selectedDatabase]);

  function renderAdditionalField(field: CaptureField) {
    const id = additionalFieldId(field.name);
    const title = fieldLabel(field.name);

    if (field.kind === "boolean") {
      return (
        <Form.Dropdown key={field.name} id={id} title={title} defaultValue="__unset" info={requiredInfo(field)}>
          <Form.Dropdown.Item value="__unset" title="Not Set" />
          <Form.Dropdown.Item value="true" title="Yes" />
          <Form.Dropdown.Item value="false" title="No" />
        </Form.Dropdown>
      );
    }

    if (field.kind === "date" || field.kind === "date-time") {
      return (
        <Form.DatePicker
          key={field.name}
          id={id}
          title={title}
          type={field.kind === "date" ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
          info={requiredInfo(field)}
        />
      );
    }

    if (field.kind === "relation") {
      const options = relationOptions[field.name] ?? [];
      const isLoadingOptions = loadingRelationFields[field.name];

      return (
        <Form.Dropdown
          key={field.name}
          id={id}
          title={title}
          defaultValue="__unset"
          placeholder={isLoadingOptions ? "Loading options…" : `Choose ${title}`}
          info={requiredInfo(field)}
        >
          <Form.Dropdown.Item value="__unset" title={isLoadingOptions ? "Loading…" : "Not Set"} />
          {options.map((option) => (
            <Form.Dropdown.Item key={option.id} value={option.id} title={option.title} />
          ))}
        </Form.Dropdown>
      );
    }

    if (field.kind === "relation-collection") {
      const options = relationOptions[field.name] ?? [];
      const isLoadingOptions = loadingRelationFields[field.name];

      return (
        <Form.TagPicker
          key={field.name}
          id={id}
          title={title}
          placeholder={isLoadingOptions ? "Loading options…" : `Choose ${title}`}
          info={requiredInfo(field)}
        >
          {options.map((option) => (
            <Form.TagPicker.Item key={option.id} value={option.id} title={option.title} />
          ))}
        </Form.TagPicker>
      );
    }

    const placeholder =
      field.kind === "integer" || field.kind === "decimal"
        ? "Enter a number"
        : field.kind === "location"
          ? "Enter an address"
          : `Enter ${title.toLocaleLowerCase()}`;

    return (
      <Form.TextField key={field.name} id={id} title={title} placeholder={placeholder} info={requiredInfo(field)} />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Couldn’t connect to Fibery\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.RotateClockwise} onAction={loadSchema} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Task" icon={Icon.Checkmark} onSubmit={handleSubmit} />
          <Action title="Refresh Fibery Schema" icon={Icon.RotateClockwise} onAction={loadSchema} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Task Name" placeholder="What needs to be done?" autoFocus />
      <Form.Separator />
      <Form.Dropdown
        id="database"
        title="Database"
        placeholder="Choose a Fibery database"
        value={database}
        onChange={handleDatabaseChange}
      >
        {databases.map((item) => (
          <Form.Dropdown.Item
            key={item.name}
            value={item.name}
            title={databaseLabel(item.name)}
            keywords={item.name.split("/")}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="enabledFields"
        title="Additional Fields"
        placeholder="Add fields to this task"
        value={enabledFields}
        onChange={setEnabledFields}
      >
        {selectedDatabase?.fields
          .filter((field) => field.name !== selectedDatabase.taskNameField)
          .map((field) => (
            <Form.TagPicker.Item key={field.name} value={field.name} title={fieldLabel(field.name)} />
          ))}
      </Form.TagPicker>
      {selectedDatabase?.fields
        .filter((field) => enabledFields.includes(field.name) && field.name !== selectedDatabase.taskNameField)
        .map(renderAdditionalField)}
    </Form>
  );
}

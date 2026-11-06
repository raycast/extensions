import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useEffect, useMemo, useRef, useState } from "react";
import { testConnection } from "../lib/connection";
import { isValidHeaderName, isValidHttpUrl } from "../lib/request";
import { Shortcuts } from "../lib/shortcuts";
import { saveEnvironment } from "../lib/store";
import { GraphQLEnvironment, Header } from "../lib/types";

interface Values {
  name: string;
  url: string;
}

interface Props {
  environment?: GraphQLEnvironment;
  /** Pre-filled values, used when duplicating */
  draft?: Partial<GraphQLEnvironment>;
  onSaved?: (environment: GraphQLEnvironment) => void;
}

/** One editable header. `key` is a stable id so React keeps each row's fields while rows are added and removed. */
interface HeaderRow {
  key: string;
  name: string;
  value: string;
}

const newRow = (header?: Header): HeaderRow => ({
  key: randomUUID(),
  name: header?.name ?? "",
  value: header?.value ?? "",
});

const nameFieldId = (row: HeaderRow) => `header-name-${row.key}`;
const valueFieldId = (row: HeaderRow) => `header-value-${row.key}`;
const isBlank = (row: HeaderRow) => !row.name.trim() && !row.value.trim();

const HINT =
  process.platform === "win32"
    ? "Ctrl+N adds a header · Ctrl+Shift+X removes the header you are editing"
    : "⌘N adds a header · ⌃X removes the header you are editing";

/** Errors keyed by field id. Rows with neither name nor value are ignored. */
function validateRows(rows: HeaderRow[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) {
      if (row.value.trim()) errors[nameFieldId(row)] = "Header name is required";
      continue;
    }
    if (!isValidHeaderName(name)) {
      errors[nameFieldId(row)] = "Header names can't contain spaces, colons or quotes";
      continue;
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) errors[nameFieldId(row)] = `"${name}" is already set above`;
    seen.add(lower);
  }
  return errors;
}

const rowsToHeaders = (rows: HeaderRow[]): Header[] =>
  rows.filter((row) => row.name.trim()).map((row) => ({ name: row.name.trim(), value: row.value.trim() }));

export function EnvironmentForm({ environment, draft, onSaved }: Props) {
  const { pop } = useNavigation();
  const source = environment ?? draft;

  const [rows, setRows] = useState<HeaderRow[]>(() =>
    source?.headers?.length ? source.headers.map((header) => newRow(header)) : [newRow()],
  );
  const [focusedKey, setFocusedKey] = useState<string>();
  const [focusRequest, setFocusRequest] = useState<string>();
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);
  const nameRefs = useRef(new Map<string, Form.TextField>());

  const rowErrors = useMemo(() => validateRows(rows), [rows]);
  const visibleError = (fieldId: string) => (submitted || touched.has(fieldId) ? rowErrors[fieldId] : undefined);

  const { handleSubmit, itemProps, values, focus } = useForm<Values>({
    initialValues: { name: source?.name ?? "", url: source?.url ?? "" },
    validation: {
      name: FormValidation.Required,
      url: (value) => {
        if (!value?.trim()) return "Required";
        if (!isValidHttpUrl(value.trim())) return "Enter an http(s) URL";
      },
    },
    async onSubmit(values) {
      const invalid = Object.keys(validateRows(rows));
      if (invalid.length) {
        await showToast({ style: Toast.Style.Failure, title: "Fix the highlighted headers" });
        return false;
      }
      const saved = await saveEnvironment(
        { name: values.name.trim(), url: values.url.trim(), headers: rowsToHeaders(rows) },
        environment?.id,
      );
      await showToast({
        style: Toast.Style.Success,
        title: environment ? "Environment updated" : "Environment created",
      });
      onSaved?.(saved);
      pop();
    },
  });

  // Focus a row's name field once it has been rendered (after adding or removing a row).
  useEffect(() => {
    if (!focusRequest) return;
    nameRefs.current.get(focusRequest)?.focus();
    setFocusRequest(undefined);
  }, [focusRequest, rows]);

  function updateRow(key: string, patch: Partial<Pick<HeaderRow, "name" | "value">>) {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const last = rows[rows.length - 1];
    // Reuse a trailing empty row instead of piling up blank ones.
    if (last && isBlank(last)) {
      setFocusRequest(last.key);
      return;
    }
    const row = newRow();
    setRows([...rows, row]);
    setFocusRequest(row.key);
  }

  function removeRow(key: string) {
    const index = rows.findIndex((row) => row.key === key);
    if (index === -1) return;
    const next = rows.filter((row) => row.key !== key);
    setRows(next);
    const target = next[Math.min(index, next.length - 1)];
    setFocusedKey(target?.key);
    if (target) setFocusRequest(target.key);
    else focus("url");
  }

  async function handleTest() {
    const url = values.url.trim();
    if (!isValidHttpUrl(url) || Object.keys(rowErrors).length > 0) {
      setSubmitted(true);
      await showToast({ style: Toast.Style.Failure, title: "Fix the URL and headers first" });
      return;
    }
    await testConnection({ url, headers: rowsToHeaders(rows) });
  }

  const focusedIndex = rows.findIndex((row) => row.key === focusedKey);
  const focusedRow = focusedIndex === -1 ? undefined : rows[focusedIndex];

  return (
    <Form
      navigationTitle={environment ? `Edit ${environment.name}` : "New Environment"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Environment"
            icon={Icon.Check}
            onSubmit={(formValues: Values) => {
              setSubmitted(true);
              return handleSubmit(formValues);
            }}
          />
          <ActionPanel.Section title="Headers">
            <Action title="Add Header" icon={Icon.Plus} shortcut={Shortcuts.AddRow} onAction={addRow} />
            {focusedRow && (
              <Action
                title={`Remove Header ${focusedRow.name.trim() ? `"${focusedRow.name.trim()}"` : focusedIndex + 1}`}
                icon={Icon.Minus}
                style={Action.Style.Destructive}
                shortcut={Shortcuts.RemoveRow}
                onAction={() => removeRow(focusedRow.key)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Test Connection"
              icon={Icon.Network}
              shortcut={Shortcuts.TestConnection}
              onAction={handleTest}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="Production"
        autoFocus
        {...itemProps.name}
        onFocus={() => setFocusedKey(undefined)}
      />
      <Form.TextField
        title="Endpoint URL"
        placeholder="https://api.example.com/graphql"
        {...itemProps.url}
        onFocus={() => setFocusedKey(undefined)}
      />

      <Form.Separator />
      <Form.Description
        title="Headers"
        text="Sent with every request to this endpoint and kept in this extension's local Raycast storage. Content-Type: application/json is added automatically."
      />

      {rows.flatMap((row, index) => [
        <Form.TextField
          key={nameFieldId(row)}
          id={nameFieldId(row)}
          ref={(instance) => {
            if (instance) nameRefs.current.set(row.key, instance);
            else nameRefs.current.delete(row.key);
          }}
          title={`Header ${index + 1}`}
          placeholder={index === 0 ? "Name, e.g. Authorization" : "Name"}
          value={row.name}
          error={visibleError(nameFieldId(row))}
          onChange={(name) => updateRow(row.key, { name })}
          onFocus={() => setFocusedKey(row.key)}
          onBlur={() => setTouched((previous) => new Set(previous).add(nameFieldId(row)))}
        />,
        <Form.TextField
          key={valueFieldId(row)}
          id={valueFieldId(row)}
          placeholder={index === 0 ? "Value, e.g. Bearer <token>" : "Value"}
          value={row.value}
          error={visibleError(valueFieldId(row))}
          onChange={(value) => updateRow(row.key, { value })}
          onFocus={() => setFocusedKey(row.key)}
        />,
      ])}

      <Form.Description text={rows.length ? HINT : `No headers. ${HINT.split(" · ")[0]}.`} />
    </Form>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { EnpassEntry, EnpassField } from "../types";
import {
  copyEntryField,
  getDisplayLogin,
  getEntryDetails,
  getEntryUrl,
  pasteEntryField,
  pasteValue,
} from "../utils/enpass";

interface EntryDetailProps {
  entry: EnpassEntry;
  pin?: string;
}

interface VisibleField {
  id: string;
  title: string;
  value: string;
  kind: "text" | "password" | "url" | "notes";
}

function normalizeLabel(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function titleFromLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPasswordField(field: EnpassField): boolean {
  const label = normalizeLabel(field.label);
  const type = normalizeLabel(field.type);
  return (
    label.includes("password") ||
    label === "pass" ||
    type.includes("password") ||
    type === "concealed"
  );
}

function isNotesField(field: EnpassField): boolean {
  const label = normalizeLabel(field.label);
  const type = normalizeLabel(field.type);
  return (
    label.includes("note") || type.includes("note") || type.includes("textarea")
  );
}

function getVisibleFields(entry: EnpassEntry): VisibleField[] {
  const fields: VisibleField[] = [];
  const seen = new Set<string>();

  function addField(
    title: string,
    value: string | undefined,
    kind: VisibleField["kind"] = "text",
  ) {
    const cleanValue = value?.trim();
    if (!cleanValue) {
      return;
    }

    const key = `${title.toLowerCase()}:${cleanValue}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    fields.push({
      id: `${fields.length}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      value: cleanValue,
      kind,
    });
  }

  addField("Title", entry.title);
  addField("Username / Email", getDisplayLogin(entry));
  addField("Password", entry.password, "password");
  addField("URL", getEntryUrl(entry), "url");
  addField("Category", entry.category);
  addField("Label", entry.label);
  addField("Type", entry.type);

  for (const field of entry.fields ?? []) {
    const label = field.label?.trim() || field.type?.trim() || "Field";
    const kind = isPasswordField(field)
      ? "password"
      : isNotesField(field)
        ? "notes"
        : field.value?.startsWith("http")
          ? "url"
          : "text";
    addField(titleFromLabel(label), field.value, kind);
  }

  addField("Notes", entry.notes, "notes");
  return fields;
}

function isDedicatedCopyField(field: VisibleField): boolean {
  return ["Username / Email", "Password", "URL"].includes(field.title);
}

export function EntryDetail({ entry, pin }: EntryDetailProps) {
  const [detail, setDetail] = useState<EnpassEntry>(entry);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      setIsLoading(true);
      try {
        setDetail(await getEntryDetails(entry, pin));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load credential",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDetail();
  }, [entry.uuid, entry.title, entry.login, entry.label, pin]);

  const login = getDisplayLogin(detail);
  const url = getEntryUrl(detail);
  const visibleFields = useMemo(() => getVisibleFields(detail), [detail]);
  const additionalCopyFields = useMemo(
    () => visibleFields.filter((field) => !isDedicatedCopyField(field)),
    [visibleFields],
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={detail.title}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Paste">
            {login ? (
              <Action
                title="Copy and Paste Username / Email"
                icon={Icon.Person}
                onAction={() => pasteValue("Username / Email", login)}
              />
            ) : null}
            <Action
              title="Copy and Paste Password"
              icon={Icon.Key}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() =>
                pasteEntryField("Password", detail, "password", pin)
              }
            />
            {url ? (
              <Action
                title="Copy and Paste URL"
                icon={Icon.Link}
                onAction={() => pasteValue("URL", url)}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {login ? (
              <Action.CopyToClipboard
                title="Copy Username / Email"
                icon={Icon.Person}
                content={login}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            ) : null}
            <Action
              title="Copy Password"
              icon={Icon.Key}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() =>
                copyEntryField("Password", detail, "password", pin)
              }
            />
            {url ? (
              <Action.CopyToClipboard
                title="Copy URL"
                icon={Icon.Link}
                content={url}
              />
            ) : null}
            {additionalCopyFields.map((field) => (
              <Action.CopyToClipboard
                key={`copy-${field.id}`}
                title={`Copy ${field.title}`}
                icon={Icon.Clipboard}
                content={field.value}
                concealed={field.kind === "password"}
              />
            ))}
          </ActionPanel.Section>
          {url ? (
            <ActionPanel.Section>
              <Action.OpenInBrowser title="Open URL" url={url} />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
      {visibleFields.map((field) =>
        field.kind === "password" ? (
          <Form.PasswordField
            key={field.id}
            id={field.id}
            title={field.title}
            value={field.value}
            onChange={() => undefined}
          />
        ) : field.kind === "notes" ? (
          <Form.TextArea
            key={field.id}
            id={field.id}
            title={field.title}
            value={field.value}
            onChange={() => undefined}
          />
        ) : (
          <Form.TextField
            key={field.id}
            id={field.id}
            title={field.title}
            value={field.value}
            onChange={() => undefined}
          />
        ),
      )}
      {visibleFields.length === 0 ? (
        <Form.Description text="No fields found for this credential." />
      ) : null}
    </Form>
  );
}

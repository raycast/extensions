import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addEntry, updateEntry } from "../storage";
import { ApiEntry } from "../types";

interface Props {
  entry?: ApiEntry;
  onSave: () => void;
}

function parseExpiry(
  input: string,
): { date: string; error?: never } | { date?: never; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { date: undefined as unknown as string };

  // Pure number: treat as days from today
  if (/^\d+$/.test(trimmed)) {
    const days = parseInt(trimmed, 10);
    if (days <= 0) return { error: "Enter a positive number of days" };
    const d = new Date();
    d.setDate(d.getDate() + days);
    return { date: d.toISOString().split("T")[0] };
  }

  // Date string: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return { error: "Invalid date" };
    return { date: trimmed };
  }

  return { error: 'Use days (e.g. "90") or a date (e.g. "2026-12-31")' };
}

export function ApiForm({ entry, onSave }: Props) {
  const { pop } = useNavigation();
  const isEditing = !!entry;

  const [nameError, setNameError] = useState<string | undefined>();
  const [keyError, setKeyError] = useState<string | undefined>();
  const [expiryError, setExpiryError] = useState<string | undefined>();

  // Show existing expiry as YYYY-MM-DD in the text field
  const defaultExpiry = entry?.expiresAt ?? "";

  async function handleSubmit(values: {
    name: string;
    key: string;
    provider: string;
    url: string;
    expiresAt: string;
    tags: string;
  }) {
    let hasError = false;

    if (!values.name.trim()) {
      setNameError("Name is required");
      hasError = true;
    }

    if (!values.key.trim()) {
      setKeyError("API key is required");
      hasError = true;
    }

    const expiryResult = parseExpiry(values.expiresAt);
    if (expiryResult.error) {
      setExpiryError(expiryResult.error);
      hasError = true;
    }

    if (hasError) return;

    const now = new Date().toISOString();
    const tags = values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const saved: ApiEntry = {
      id: entry?.id ?? uuidv4(),
      name: values.name.trim(),
      key: values.key.trim(),
      provider: values.provider.trim() || undefined,
      url: values.url.trim() || undefined,
      expiresAt: expiryResult.date || undefined,
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
      tags,
    };

    try {
      if (isEditing) {
        await updateEntry(saved);
        await showToast({
          style: Toast.Style.Success,
          title: "API key updated",
        });
      } else {
        await addEntry(saved);
        await showToast({ style: Toast.Style.Success, title: "API key added" });
      }
      onSave();
      pop();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save API key",
      });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit "${entry?.name}"` : "Add API Key"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Add Api Key"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. OpenAI Main Key"
        defaultValue={entry?.name ?? ""}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />

      <Form.PasswordField
        id="key"
        title="API Key"
        placeholder="Paste your API key here"
        defaultValue={entry?.key ?? ""}
        error={keyError}
        onChange={() => setKeyError(undefined)}
        info="Stored in Raycast's local encrypted database"
      />

      <Form.TextField
        id="provider"
        title="Provider"
        placeholder="e.g. OpenAI, Google, AWS"
        defaultValue={entry?.provider ?? ""}
      />

      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://platform.openai.com/api-keys"
        defaultValue={entry?.url ?? ""}
        info="Link to the provider's key management page"
      />

      <Form.TextField
        id="expiresAt"
        title="Expires In"
        placeholder="90  or  2026-12-31"
        defaultValue={defaultExpiry}
        error={expiryError}
        onChange={() => setExpiryError(undefined)}
        info='Days from today (e.g. "90") or exact date "YYYY-MM-DD". Leave empty if no expiry.'
      />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="llm, summarization, prod"
        defaultValue={entry?.tags.join(", ") ?? ""}
        info="Comma-separated"
      />
    </Form>
  );
}

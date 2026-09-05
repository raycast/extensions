import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { findEntry, removeEntry, upsertEntry } from "./vault";
import { loadOrThrow, persistVault } from "./session";
import { Entry } from "./types";

export interface EntryFormValues {
  slug: string;
  password: string;
  username?: string;
  url?: string;
  group?: string;
  notes?: string;
}

/**
 * Add or edit an entry. Pass `existing` to edit in place.
 * `groups` populates the group dropdown.
 */
export default function EntryForm(props: {
  dir: string;
  existing?: Entry;
  groups: string[];
  defaultGroup?: string;
  onSaved: (slug: string) => void;
}) {
  const [slugError, setSlugError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const existing = props.existing;

  async function handleSubmit(values: EntryFormValues): Promise<boolean> {
    const slug = values.slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug) {
      setSlugError("Slug is required");
      return false;
    }
    // If renaming, check the new slug isn't taken by a different entry
    const vault = loadOrThrow(props.dir);
    const conflict = findEntry(vault, slug);
    if (conflict && existing && conflict.slug !== existing.slug) {
      setSlugError(`"${slug}" already exists`);
      return false;
    }
    if (conflict && !existing) {
      setSlugError(`"${slug}" already exists — open it to edit`);
      return false;
    }
    if (!values.password || values.password.length === 0) {
      setPasswordError("Password is required");
      return false;
    }

    const now = Date.now();
    const entry: Entry = {
      slug,
      password: values.password,
      username: values.username?.trim() || undefined,
      url: values.url?.trim() || undefined,
      metadata: existing?.metadata,
      group: values.group?.trim().toLowerCase() || undefined,
      notes: values.notes?.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    upsertEntry(vault, entry);
    // Renaming: remove the old slug so we don't leave a duplicate behind.
    if (existing && existing.slug !== slug) {
      removeEntry(vault, existing.slug);
    }
    persistVault(props.dir, vault);

    await showToast({ style: Toast.Style.Success, title: `Saved ${slug}` });
    props.onSaved(slug);
    return true;
  }

  return (
    <Form
      navigationTitle={existing ? `Edit ${existing.slug}` : "Add Password"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="slug"
        title="Slug"
        placeholder="github"
        defaultValue={existing?.slug ?? ""}
        error={slugError}
        onChange={() => setSlugError(undefined)}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="secret"
        defaultValue={existing?.password ?? ""}
        error={passwordError}
        onChange={() => setPasswordError(undefined)}
      />
      <Form.TextField
        id="username"
        title="Username"
        placeholder="me@example.com"
        defaultValue={existing?.username ?? ""}
      />
      <Form.TextField id="url" title="URL" placeholder="https://github.com" defaultValue={existing?.url ?? ""} />
      <Form.Dropdown id="group" title="Group" defaultValue={existing?.group ?? props.defaultGroup ?? ""}>
        <Form.Dropdown.Item value="" title="(no group)" />
        {props.groups.map((g) => (
          <Form.Dropdown.Item key={g} value={g} title={g} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Anything else you want to remember"
        defaultValue={existing?.notes ?? ""}
      />
    </Form>
  );
}

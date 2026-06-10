import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { createDatabase, getMe } from "./api";

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `scratch-${base || "db"}`;
}

export default function CreateDatabase() {
  const [name, setName] = useState("");

  async function submit(values: { name: string }) {
    const trimmed = values.name.trim();
    if (!trimmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating database…",
    });
    try {
      const me = await getMe();
      const db = await createDatabase(trimmed, toSlug(trimmed));
      const path = `${me.namespaceSlug}/${db.slug}`;
      await Clipboard.copy(path);
      toast.style = Toast.Style.Success;
      toast.title = "Database created";
      toast.message = `${path} (copied)`;
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Create failed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            title="Create Database"
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="weekend-prototype"
        value={name}
        onChange={setName}
        info="An admin-role token is required to create databases."
      />
      <Form.Description title="Slug" text={toSlug(name || "…")} />
    </Form>
  );
}

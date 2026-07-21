import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStore } from "../lib/context";
import { splitFolder } from "../lib/parse";
import type { Secret, TagInfo } from "../lib/types";
import { tagColor } from "./tag-color";

function parseTags(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SecretForm({ secret, onSaved }: { secret?: Secret; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<TagInfo[]>([]);
  const [tags, setTags] = useState<string[]>(secret?.tags ?? []);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    getStore()
      .listTags()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  // Every known tag plus whatever is selected: lets the chip field's dropdown
  // search existing tags (Raycast excludes already-added ones automatically).
  const itemNames = [...new Set([...catalog.map((t) => t.name), ...tags])].sort();

  // Typing a new tag: Enter (newline) or a comma commits it as a chip.
  function handleDraft(text: string) {
    const parts = text.split(/[\n,]/);
    if (parts.length === 1) {
      setDraft(text);
      return;
    }
    const committed = parts
      .slice(0, -1)
      .map((s) => s.trim())
      .filter(Boolean);
    if (committed.length) setTags((cur) => [...new Set([...cur, ...committed])]);
    setDraft(parts[parts.length - 1]);
  }

  async function handleSubmit(values: { name: string; value: string; folder: string }) {
    if (!values.name.trim() || !values.value.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name and value are required" });
      return;
    }
    setLoading(true);
    try {
      const store = getStore();
      const input = {
        name: values.name.trim(),
        value: values.value,
        folder: splitFolder(values.folder),
        // Commit anything still typed but not yet turned into a chip.
        tags: [...new Set([...tags, ...parseTags(draft)])],
      };
      if (secret) await store.update(secret.id, input);
      else await store.add(input);
      await showToast({ style: Toast.Style.Success, title: secret ? "Secret updated" : "Secret added" });
      onSaved?.();
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={secret ? "Save Changes" : "Save Secret"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={secret?.name} placeholder="AWS Access Key" />
      <Form.PasswordField id="value" title="Value" defaultValue={secret?.value} placeholder="secret value" />
      <Form.TextField id="folder" title="Folder" defaultValue={secret?.folder.join("/")} placeholder="work/dev" />
      {/* Chips: x removes; the dropdown searches existing tags. */}
      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags} placeholder="Pick existing tags">
        {itemNames.map((name) => (
          <Form.TagPicker.Item
            key={name}
            value={name}
            title={name}
            icon={{ source: Icon.Dot, tintColor: tagColor(name) }}
          />
        ))}
      </Form.TagPicker>
      {/* Untitled, so it reads as part of the Tags control above. */}
      <Form.TextArea
        id="tagInput"
        value={draft}
        onChange={handleDraft}
        placeholder="Type a new tag, then press Enter or , to add it as a chip above"
      />
    </Form>
  );
}

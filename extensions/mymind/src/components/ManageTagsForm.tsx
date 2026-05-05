import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { addTagsToObject, MyMindObject, removeTagsFromObject } from "../api";
import { parseTags } from "../utils";

export function ManageTagsForm({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const existing = Array.from(new Set(object.tags.map((t) => t.name)));
  const [keep, setKeep] = useState<string[]>(existing);

  const handleSubmit = async ({ newTags }: { newTags: string }) => {
    const lowerKeep = new Set(keep.map((t) => t.toLowerCase()));
    const candidates = parseTags(newTags) ?? [];
    const toAdd = candidates.filter((t) => !lowerKeep.has(t.toLowerCase()));
    const toRemove = existing.filter((t) => !keep.includes(t));

    if (toAdd.length === 0 && toRemove.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No changes" });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving tags…" });
    try {
      await Promise.all([addTagsToObject(object.id, toAdd), removeTagsFromObject(object.id, toRemove)]);
      toast.style = Toast.Style.Success;
      toast.title = describeChange(toAdd.length, toRemove.length);
      onChange?.();
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to update tags" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={submitting}
      navigationTitle="Manage Tags"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {existing.length > 0 ? (
        <Form.TagPicker id="keep" title="Current Tags" value={keep} onChange={setKeep} info="Deselect to remove.">
          {existing.map((name) => (
            <Form.TagPicker.Item key={name} value={name} title={name} />
          ))}
        </Form.TagPicker>
      ) : (
        <Form.Description title="Current Tags" text="No tags yet." />
      )}
      <Form.TextField id="newTags" title="Add Tags" placeholder="Comma-separated, e.g. design, inspiration" />
    </Form>
  );
}

function describeChange(added: number, removed: number): string {
  if (added && removed) return `Added ${added}, removed ${removed}`;
  if (added) return added === 1 ? "Added 1 tag" : `Added ${added} tags`;
  return removed === 1 ? "Removed 1 tag" : `Removed ${removed} tags`;
}

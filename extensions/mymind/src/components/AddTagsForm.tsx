import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { addTagsToObject, MyMindObject } from "../api";
import { parseTags } from "../utils";

export function AddTagsForm({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const existing = object.tags.map((t) => t.name);

  const handleSubmit = async ({ tags }: { tags: string }) => {
    const candidates = parseTags(tags) ?? [];
    const lowerExisting = new Set(existing.map((t) => t.toLowerCase()));
    const fresh = candidates.filter((t) => !lowerExisting.has(t.toLowerCase()));

    if (fresh.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: candidates.length === 0 ? "Enter at least one tag" : "All tags already present",
      });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding tags…" });
    try {
      await addTagsToObject(object.id, fresh);
      toast.style = Toast.Style.Success;
      toast.title = fresh.length === 1 ? `Added "${fresh[0]}"` : `Added ${fresh.length} tags`;
      onChange?.();
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to add tags" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={submitting}
      navigationTitle="Add Tags"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Tags" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {existing.length > 0 && <Form.Description title="Current tags" text={existing.join(", ")} />}
      <Form.TextField
        id="tags"
        title="New Tags"
        placeholder="Comma-separated, e.g. design, inspiration"
        info="The mymind API only supports adding tags. Removing a tag still has to happen on the web app."
      />
    </Form>
  );
}

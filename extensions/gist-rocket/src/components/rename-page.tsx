import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { updatePage } from "../lib/github";

export function RenamePage(props: { gistId: string; currentDescription: string; onDone?: () => void }) {
  const { pop } = useNavigation();
  const [description, setDescription] = useState(props.currentDescription);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming…" });
    try {
      await updatePage({ id: props.gistId, description, files: [] });
      await toast.hide();
      await showToast({ style: Toast.Style.Success, title: "Renamed" });
      props.onDone?.();
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Title" icon={Icon.Check} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Title" value={description} onChange={setDescription} />
    </Form>
  );
}

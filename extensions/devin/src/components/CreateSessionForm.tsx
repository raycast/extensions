import { Action, ActionPanel, Form, Keyboard, Toast, open, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getDevinClient } from "../lib/devin";
import { parseTags } from "../lib/format";
import { CreateSessionResult } from "../types";

type FormValues = {
  prompt: string;
  title: string;
  tags: string;
  snapshotId: string;
  playbookId: string;
  maxAcuLimit: string;
  unlisted: boolean;
  idempotent: boolean;
};

type Props = {
  onCreated?: (session: CreateSessionResult) => Promise<void> | void;
};

export function CreateSessionForm({ onCreated }: Props) {
  const client = getDevinClient();
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.prompt || !values.prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Prompt required",
        message: "Please enter a prompt before creating a session.",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const session = await client.createSession({
        prompt: values.prompt.trim(),
        title: values.title.trim() || undefined,
        tags: parseTags(values.tags),
        snapshotId: values.snapshotId.trim() || undefined,
        playbookId: values.playbookId.trim() || undefined,
        maxAcuLimit: values.maxAcuLimit ? Number(values.maxAcuLimit) : undefined,
        unlisted: values.unlisted,
        idempotent: values.idempotent,
      });

      await onCreated?.(session);
      await showToast({
        style: Toast.Style.Success,
        title: session.isNewSession ? "Session created" : "Reused existing session",
        message: session.id,
      });
      await open(session.url);

      if (onCreated) {
        pop();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to create session",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create Devin Session"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Session" onSubmit={handleSubmit} shortcut={Keyboard.Shortcut.Common.Save} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" title="Prompt" placeholder="Describe the task for Devin" />
      <Form.TextField id="title" title="Title" placeholder="Optional custom title" />
      <Form.TextField id="tags" title="Tags" placeholder="frontend, bugfix, urgent" />
      <Form.TextField id="snapshotId" title="Snapshot ID" placeholder="Optional snapshot ID" />
      <Form.TextField id="playbookId" title="Playbook ID" placeholder="Optional playbook ID" />
      <Form.TextField id="maxAcuLimit" title="Max ACU Limit" placeholder="Optional positive integer" />
      <Form.Checkbox id="unlisted" title="Visibility" label="Create as unlisted session" defaultValue={false} />
      <Form.Checkbox
        id="idempotent"
        title=""
        label="Reuse an existing matching session when supported"
        defaultValue={false}
      />
    </Form>
  );
}

import { useRef, useState } from "react";
import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { Resume } from "../types/resume";
import { ResumeDocument, createResumeDocument, updateResumeDocument } from "../utils/resumeDocuments";

export type ResumeEditorValues = { title: string; resumeJson: string };

export default function ResumeEditor({
  document,
  initialResume,
  sourceUrl,
  onSaved,
  enableDrafts = false,
  draftValues,
}: {
  document?: ResumeDocument;
  initialResume?: Resume;
  sourceUrl?: string;
  onSaved?: (document: ResumeDocument) => void | Promise<void>;
  enableDrafts?: boolean;
  draftValues?: Partial<ResumeEditorValues>;
}) {
  const { pop } = useNavigation();
  const saving = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string>();
  const { itemProps, handleSubmit } = useForm<ResumeEditorValues>({
    initialValues: {
      title: draftValues?.title ?? document?.title ?? initialResume?.basics?.name ?? "Untitled Resume",
      resumeJson: draftValues?.resumeJson ?? JSON.stringify(document?.resume ?? initialResume ?? {}, null, 2),
    },
    validation: { title: (value) => (!value?.trim() ? "Title is required" : undefined) },
    onSubmit: async (values) => {
      if (saving.current) return;
      saving.current = true;
      setIsSaving(true);
      setJsonError(undefined);
      try {
        const saved = document
          ? await updateResumeDocument({ id: document.id, ...values })
          : await createResumeDocument({ ...values, sourceUrl });
        await onSaved?.(saved);
        await showToast({ style: Toast.Style.Success, title: "Resume saved" });
        pop();
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : String(error));
        await showFailureToast(error, { title: "Could not save resume" });
      } finally {
        saving.current = false;
        setIsSaving(false);
      }
    },
  });

  return (
    <Form
      enableDrafts={enableDrafts}
      isLoading={isSaving}
      navigationTitle={document ? "Edit Resume" : "Create Resume"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Resume" shortcut={{ modifiers: ["cmd"], key: "s" }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" />
      <Form.TextArea {...itemProps.resumeJson} title="Resume JSON" error={jsonError} />
      {!enableDrafts && (
        <Form.Description text="Save your changes before leaving this form. Unsaved edits will be discarded." />
      )}
      {sourceUrl && <Form.Description title="Source URL" text={sourceUrl} />}
    </Form>
  );
}

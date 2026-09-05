import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";

type CommentFormProps = {
  navigationTitle: string;
  /** Field label above the text area, e.g. "Reply" or "Comment". */
  label: string;
  submitTitle: string;
  /** Shown above the field — the thread or PR the text will be posted to. */
  context?: string;
  /** Posts the body to GitHub. Throwing surfaces a failure toast and keeps the form open. */
  onSubmit: (body: string) => Promise<void>;
};

/** A single-field markdown composer used for PR comments and thread replies. */
export function CommentForm({ navigationTitle, label, submitTitle, context, onSubmit }: CommentFormProps) {
  const { pop } = useNavigation();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (!body.trim()) {
      setError("Write something first");
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Posting to GitHub…" });
    try {
      await onSubmit(body);
      toast.style = Toast.Style.Success;
      toast.title = "Posted";
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not post";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={navigationTitle}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {context ? <Form.Description text={context} /> : null}
      <Form.TextArea
        id="body"
        title={label}
        placeholder="Markdown is supported"
        value={body}
        error={error}
        onChange={(value) => {
          setBody(value);
          if (error) setError(undefined);
        }}
        enableMarkdown
      />
    </Form>
  );
}

import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { useForm } from "@raycast/utils";
import { PullRequestRef, ReviewKind, submitReview } from "../lib/github";

const COPY: Record<
  ReviewKind,
  {
    title: string;
    submit: string;
    done: string;
    progress: string;
    failure: string;
    placeholder: string;
    icon: Icon;
    bodyRequired: boolean;
  }
> = {
  approve: {
    title: "Approve",
    submit: "Approve",
    done: "Approved",
    progress: "Approving",
    failure: "approve",
    placeholder: "Looks good to me (optional)",
    icon: Icon.CheckCircle,
    bodyRequired: false,
  },
  "request-changes": {
    title: "Request Changes",
    submit: "Request Changes",
    done: "Requested changes on",
    progress: "Requesting changes on",
    failure: "request changes on",
    placeholder: "What needs to change?",
    icon: Icon.ExclamationMark,
    bodyRequired: true,
  },
  comment: {
    title: "Comment",
    submit: "Comment",
    done: "Commented on",
    progress: "Commenting on",
    failure: "comment on",
    placeholder: "Leave a comment",
    icon: Icon.SpeechBubble,
    bodyRequired: true,
  },
};

/** Writes a review with a message, through `gh pr review`. */
export function ReviewForm(props: {
  pullRequest: PullRequestRef;
  title: string;
  kind: ReviewKind;
  onReviewed: () => void;
}) {
  const { pullRequest, title, kind, onReviewed } = props;
  const [isSubmitting, setSubmitting] = useState(false);
  // A ref also blocks a second submission before React commits the loading state.
  const submitting = useRef(false);
  const copy = COPY[kind];
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ body: string }>({
    initialValues: { body: "" },
    validation: {
      body: (value) => (copy.bodyRequired && !value?.trim() ? "Write a message for this review" : undefined),
    },
    async onSubmit({ body }) {
      if (isSubmitting || submitting.current) return;
      submitting.current = true;
      setSubmitting(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: `${copy.progress} #${pullRequest.number}…` });
      try {
        await submitReview(pullRequest, kind, body);
        toast.style = Toast.Style.Success;
        toast.title = `${copy.done} #${pullRequest.number}`;
        onReviewed();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Couldn't ${copy.failure} #${pullRequest.number}`;
        submitting.current = false;
        setSubmitting(false);
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`${copy.title} #${pullRequest.number}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={copy.submit} icon={copy.icon} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={`#${pullRequest.number}`} text={title} />
      <Form.TextArea title="Message" placeholder={copy.placeholder} enableMarkdown {...itemProps.body} />
    </Form>
  );
}

import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { createComment } from "../lib/api";
import type { WorkspaceContext } from "../lib/hooks";
import type { Issue } from "../lib/types";

export function CommentForm(props: { issue: Issue; context: WorkspaceContext; onCommented?: () => void }) {
  const { issue, context, onCommented } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ content: string }>({
    validation: { content: (value) => (value?.trim() ? undefined : "Write something first") },
    async onSubmit({ content }) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Posting comment" });
      try {
        await createComment(context.workspace.id, issue.id, content.trim());
        toast.style = Toast.Style.Success;
        toast.title = `Commented on ${issue.identifier}`;
        onCommented?.();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Couldn't post comment" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Comment on ${issue.identifier}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post Comment" icon={Icon.SpeechBubble} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={issue.identifier} text={issue.title} />
      <Form.TextArea title="Comment" placeholder="Markdown supported" enableMarkdown {...itemProps.content} />
    </Form>
  );
}

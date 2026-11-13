import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";

import type { Account } from "../lib/accounts";
import { api } from "../lib/hackban";

export function CommentForm({
  account,
  cardId,
  cardTitle,
  onCommented,
}: {
  account: Account;
  cardId: string;
  cardTitle: string;
  onCommented?: () => void;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    validation: { text: (v) => (v?.trim() ? undefined : "Write a comment") },
    async onSubmit({ text }) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Posting comment" });
      try {
        await api(account).addComment(cardId, text.trim());
        toast.style = Toast.Style.Success;
        toast.title = "Comment posted";
        onCommented?.();
        pop();
      } catch (e) {
        await showFailureToast(e, { title: "Couldn't post comment" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Comment on ${cardTitle}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post Comment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Comment" placeholder="Markdown works" enableMarkdown {...itemProps.text} />
    </Form>
  );
}

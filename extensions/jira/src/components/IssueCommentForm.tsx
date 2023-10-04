import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { Issue } from "../api/issues";
import { Comment, Comments } from "../api/comments";
import { createComment, updateComment } from "../api/comments";
import { getIssueDescription } from "../helpers/issues";
import { getErrorMessage } from "../helpers/errors";
import { MutatePromise } from "@raycast/utils";

type IssueCommentFormProps = {
  issue: Issue;
  comment?: Comment;
  mutateComments?: MutatePromise<Comment[] | undefined>;
};

export default function IssueCommentForm({ comment, issue, mutateComments }: IssueCommentFormProps) {
  const { pop } = useNavigation();

  const [content, setContent] = useState(comment ? getIssueDescription(comment.renderedBody) : "");

  async function submit() {
    await showToast({ style: Toast.Style.Animated, title: `${comment ? "Updating" : "Adding"} comment` });

    if (!content) {
      showToast({ style: Toast.Style.Failure, title: "Comment is empty" });
      return false;
    }

    try {
      comment
        ? await updateComment(issue.id, comment.id, content)
        : await createComment(issue.id, content);

      await showToast({ style: Toast.Style.Success, title: `${comment ? "Updated" : "Added"} comment` });

      pop();

      if (mutateComments) {
        mutateComments();
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${comment ? "update" : "add"} comment`,
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={comment ? "Edit Comment" : "Add Comment"}
            onSubmit={submit}
            icon={comment ? Icon.Pencil : Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="comment" title="Comment" placeholder="Leave a comment" value={content} onChange={setContent} />
    </Form>
  );
}
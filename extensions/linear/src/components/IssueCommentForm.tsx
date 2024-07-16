import { useState } from "react";
import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { CommentResult, IssueResult } from "../api/getIssues";
import { getErrorMessage } from "../helpers/errors";
import { getLinearClient } from "../api/linearClient";
import { MutatePromise } from "@raycast/utils";

type IssueCommentFormProps = {
  issue: IssueResult;
  comment?: CommentResult;
  mutateComments?: MutatePromise<CommentResult[] | undefined>;
};

export default function IssueCommentForm({ comment, issue, mutateComments }: IssueCommentFormProps) {
  const { linearClient } = getLinearClient();
  const { pop } = useNavigation();

  const [content, setContent] = useState(comment ? comment.body : "");

  async function submit() {
    await showToast({ style: Toast.Style.Animated, title: `${comment ? "Updating" : "Adding"} comment` });

    try {
      comment
        ? await linearClient.updateComment(comment.id, { body: content })
        : await linearClient.createComment({ body: content, issueId: issue.id });

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

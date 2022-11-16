import { useState } from "react";
import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { Comment, Task } from "@doist/todoist-api-typescript";
import { todoist, handleError } from "../api";
import { MutatePromise } from "@raycast/utils";

interface TaskCommentFormProps {
  comment?: Comment;
  task: Task;
  mutateTasks?: MutatePromise<Task[] | undefined>;
  mutateComments?: MutatePromise<Comment[] | undefined>;
}

export default function TaskEdit({ comment, task, mutateComments, mutateTasks }: TaskCommentFormProps) {
  const { pop } = useNavigation();

  const [content, setContent] = useState(comment ? comment.content : "");

  async function submit() {
    await showToast({ style: Toast.Style.Animated, title: `${comment ? "Updating" : "Adding"} comment` });

    try {
      comment
        ? await todoist.updateComment(comment.id, { content })
        : await todoist.addComment({ content, taskId: task.id });

      await showToast({ style: Toast.Style.Success, title: `Comment ${comment ? "updated" : "added"}` });

      if (mutateComments) {
        mutateComments();
      }

      if (mutateTasks) {
        mutateTasks();
      }

      pop();
    } catch (error) {
      handleError({ error, title: `Unable to ${comment ? "update" : "add"} comment` });
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
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="This is a dummy comment."
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}

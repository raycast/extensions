import { Action, ActionPanel, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { Comment, Task } from "@doist/todoist-api-typescript";
import { formatDistanceToNow } from "date-fns";
import useSWR, { mutate } from "swr";
import TaskCommentForm from "./TaskCommentForm";
import { todoist, handleError } from "../api";
import { SWRKeys } from "../types";
import removeMarkdown from "remove-markdown";

interface TaskCommentsProps {
  task: Task;
}

export default function TaskComments({ task }: TaskCommentsProps) {
  const { data: comments, error: getCommentsError } = useSWR(SWRKeys.comments, () =>
    todoist.getComments({ taskId: task.id })
  );

  if (getCommentsError) {
    handleError({ error: getCommentsError, title: "Unable to get comments" });
  }

  async function deleteComment(comment: Comment) {
    if (await confirmAlert({ title: "Are you sure you want to delete this comment?" })) {
      await showToast({ style: Toast.Style.Animated, title: "Deleting comment" });

      try {
        await todoist.deleteComment(comment.id);
        await showToast({ style: Toast.Style.Success, title: "Comment deleted" });
        mutate(SWRKeys.comments);
      } catch (error) {
        handleError({ error, title: "Unable to delete comment" });
      }
    }
  }

  return (
    <List isShowingDetail isLoading={!comments && !getCommentsError}>
      {comments?.map((comment, index) => (
        <List.Item
          key={comment.id}
          keywords={removeMarkdown(comment.content).split(" ")}
          title={`Comment #${index + 1}`}
          subtitle={formatDistanceToNow(new Date(comment.posted), { addSuffix: true })}
          detail={<List.Item.Detail markdown={comment.content} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Comment"
                icon={Icon.Pencil}
                target={<TaskCommentForm task={task} comment={comment} />}
              />

              <Action.Push title="Add New Comment" icon={Icon.Plus} target={<TaskCommentForm task={task} />} />

              <Action
                title="Delete Comment"
                icon={Icon.Trash}
                onAction={() => deleteComment(comment)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

import { Action, ActionPanel, Icon, List, confirmAlert, showToast, Toast, Color } from "@raycast/api";
import { Comment, Task } from "@doist/todoist-api-typescript";
import { useCachedPromise } from "@raycast/utils";
import { formatDistanceToNow } from "date-fns";
import TaskCommentForm from "./TaskCommentForm";
import { todoist, handleError } from "../api";
import removeMarkdown from "remove-markdown";

interface TaskCommentsProps {
  task: Task;
}

export default function TaskComments({ task }: TaskCommentsProps) {
  const {
    data,
    isLoading,
    error,
    mutate: mutateComments,
  } = useCachedPromise((taskId) => todoist.getComments({ taskId }), [task.id]);

  if (error) {
    handleError({ error, title: "Unable to get comments" });
  }

  async function deleteComment(comment: Comment) {
    if (
      await confirmAlert({
        title: "Delete Comment",
        message: "Are you sure you want to delete this comment?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      await showToast({ style: Toast.Style.Animated, title: "Deleting comment" });

      try {
        await todoist.deleteComment(comment.id);
        mutateComments();
        await showToast({ style: Toast.Style.Success, title: "Comment deleted" });
      } catch (error) {
        handleError({ error, title: "Unable to delete comment" });
      }
    }
  }

  return (
    <List isShowingDetail isLoading={isLoading} navigationTitle={`${task.content} - Comments`}>
      {data?.map((comment, index) => (
        <List.Item
          key={comment.id}
          keywords={removeMarkdown(comment.content).split(" ")}
          title={`Comment #${index + 1}`}
          subtitle={formatDistanceToNow(new Date(comment.postedAt), { addSuffix: true })}
          detail={<List.Item.Detail markdown={comment.content} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Comment"
                icon={Icon.Pencil}
                target={<TaskCommentForm task={task} comment={comment} mutateComments={mutateComments} />}
              />

              <Action.Push
                title="Add New Comment"
                icon={Icon.Plus}
                target={<TaskCommentForm task={task} mutateComments={mutateComments} />}
              />

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

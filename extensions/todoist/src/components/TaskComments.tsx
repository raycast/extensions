import { Action, ActionPanel, Icon, List, confirmAlert, showToast, Toast, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { formatDistanceToNow } from "date-fns";
import removeMarkdown from "remove-markdown";

import { Task, Comment, deleteComment as apiDeleteComment } from "../api";
import { getCollaboratorIcon, getUserIcon } from "../helpers/collaborators";
import useCachedData from "../hooks/useCachedData";

import TaskCommentForm from "./TaskCommentForm";

type TaskCommentsProps = {
  task: Task;
};

export default function TaskComments({ task }: TaskCommentsProps) {
  const [data, setData] = useCachedData();

  const comments = data?.notes.filter((note) => note.item_id === task.id);

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
        await apiDeleteComment(comment.id, { data, setData });
        await showToast({ style: Toast.Style.Success, title: "Comment deleted" });
      } catch (error) {
        await showFailureToast(error, { title: "Unable to delete comment" });
      }
    }
  }

  return (
    <List isShowingDetail navigationTitle={`${task.content} - Comments`}>
      {comments?.map((comment) => {
        const collaborator = data?.collaborators.find((collaborator) => collaborator.id === comment.posted_uid);

        const reactions = comment.reactions
          ? Object.entries(comment.reactions).map(([key, value]) => `${key} ${value.length}`)
          : null;

        const markdown = `${comment.content}${
          comment.file_attachment
            ? `${comment.content ? "\n\n---\n\n" : "\n\n"}[${comment.file_attachment.file_name}](${
                comment.file_attachment.file_url
              })${reactions ? "\n\n---" : ""}`
            : ""
        }${reactions ? `\n\n**${reactions.join("   ")}**` : ""}`;

        // If there are no collaborators, it means the user isn't sharing any projects with anyone else.
        // In that case, we can just use the user's own icon.
        const icon = collaborator ? getCollaboratorIcon(collaborator) : data ? getUserIcon(data.user) : Icon.Person;
        const title = collaborator?.full_name ?? data?.user.full_name ?? "Unknown";

        return (
          <List.Item
            key={comment.id}
            keywords={removeMarkdown(comment.content).split(" ")}
            icon={icon}
            title={title}
            subtitle={formatDistanceToNow(new Date(comment.posted_at), { addSuffix: true })}
            detail={<List.Item.Detail markdown={markdown} />}
            {...(comment.file_attachment ? { accessories: [{ icon: Icon.Link }] } : {})}
            actions={
              <ActionPanel>
                {data?.user.id === comment.posted_uid ? (
                  <Action.Push
                    title="Edit Comment"
                    icon={Icon.Pencil}
                    target={<TaskCommentForm task={task} comment={comment} />}
                  />
                ) : null}

                <Action.Push title="Add New Comment" icon={Icon.Plus} target={<TaskCommentForm task={task} />} />

                <ActionPanel.Section>
                  {comment.file_attachment ? (
                    <Action.OpenInBrowser
                      title="Open File Attachment"
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      url={comment.file_attachment.file_url}
                    />
                  ) : null}

                  <Action
                    title="Delete Comment"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    onAction={() => deleteComment(comment)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

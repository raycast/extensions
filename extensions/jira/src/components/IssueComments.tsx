import { List, Icon, ActionPanel, Action, confirmAlert, Color, Toast, showToast } from "@raycast/api";
import { format } from "date-fns";

import { Issue } from "../api/issues";
import { getUserAvatar } from "../helpers/avatars";
import { getIssueDescription } from "../helpers/issues";
import { Comment, deleteComment } from "../api/comments";
import { getErrorMessage } from "../helpers/errors";

import useIssueComments from "../hooks/useIssueComments";
import IssueCommentForm from "./IssueCommentForm";

//import removeMarkdown from "remove-markdown";

type IssueCommentsProps = {
  issue: Issue;
};

export default function IssueComments({ issue }: IssueCommentsProps) {
  const { comments, isLoadingComments, mutateComments } = useIssueComments(issue.id);

  async function actionDeleteComment(commentId: string) {
    if (
      await confirmAlert({
        title: "Delete Comment",
        message: "Are you sure you want to delete this comment?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting comment" });
        await mutateComments(deleteComment(issue?.id, commentId), {
          optimisticUpdate(data) {
            if (!data) {
              return data;
            }
            return data?.filter((x) => x.id !== commentId);
          },
        });

        await showToast({ style: Toast.Style.Success, title: "Deleted comment" });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete comment",
          message: getErrorMessage(error),
        });
      }
    }
  }

  return (
    <List
      isLoading={isLoadingComments}
      navigationTitle={`${issue.id} • Comments`}
      searchBarPlaceholder="Filter by user or comment content"
      isShowingDetail
    >
      <List.EmptyView
        title="No comments"
        description="This issue doesn't have any comments."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Comment"
              icon={Icon.Plus}
              target={<IssueCommentForm issue={issue} mutateComments={mutateComments} />}
            />
          </ActionPanel>
        }
      />

      {comments?.map((comment: Comment) => {
        const createdAt = new Date(comment.created);

        return (
          <List.Item
            key={comment.id}
            title={comment.author.displayName}
            subtitle={getIssueDescription(comment.renderedBody)}
            icon={getUserAvatar(comment.author)}
            //keywords={removeMarkdown(comment.renderedBody).replace(/\n/g, " ").split(" ")}
            accessories={[
              {
                date: createdAt,
                tooltip: `Created: ${format(createdAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
              },
            ]}
            detail={<List.Item.Detail markdown={getIssueDescription(comment.renderedBody)} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add comment"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  target={<IssueCommentForm issue={issue} />}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Comment"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<IssueCommentForm issue={issue} comment={comment} mutateComments={mutateComments} />}
                  />
                  <Action
                    title="Delete Comment"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => actionDeleteComment(comment.id)}
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


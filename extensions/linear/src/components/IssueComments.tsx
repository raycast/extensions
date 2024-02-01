import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { format } from "date-fns";
import removeMarkdown from "remove-markdown";

import { IssueResult } from "../api/getIssues";

import { getUserIcon } from "../helpers/users";
import { getLinearClient } from "../api/linearClient";
import { getErrorMessage } from "../helpers/errors";

import useIssueComments from "../hooks/useIssueComments";
import useMe from "../hooks/useMe";

import IssueCommentForm from "./IssueCommentForm";
import OpenInLinear from "./OpenInLinear";

type IssueCommentsProps = {
  issue: IssueResult;
};

export default function IssueComments({ issue }: IssueCommentsProps) {
  const { linearClient } = getLinearClient();

  const { me, isLoadingMe } = useMe();
  const { comments, isLoadingComments, mutateComments } = useIssueComments(issue.id);

  async function deleteComment(commentId: string) {
    if (
      await confirmAlert({
        title: "Delete Comment",
        message: "Are you sure you want to delete this comment?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting comment" });

        await mutateComments(linearClient.deleteComment(commentId), {
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
      isLoading={isLoadingComments || isLoadingMe}
      navigationTitle={`${issue.identifier} • Comments`}
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
      {comments?.map((comment) => {
        const createdAt = new Date(comment.createdAt);

        return (
          <List.Item
            key={comment.id}
            title={comment.user.displayName}
            subtitle={comment.body}
            icon={getUserIcon(comment.user)}
            keywords={removeMarkdown(comment.body).replace(/\n/g, " ").split(" ")}
            accessories={[
              {
                date: createdAt,
                tooltip: `Created: ${format(createdAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
              },
            ]}
            detail={<List.Item.Detail markdown={comment.body} />}
            actions={
              <ActionPanel>
                <OpenInLinear title="Open Comment" url={comment.url} />

                {me?.id === comment.user.id ? (
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
                      onAction={() => deleteComment(comment.id)}
                    />
                  </ActionPanel.Section>
                ) : null}

                <ActionPanel.Section>
                  <Action.Push
                    title="Add Comment"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    target={<IssueCommentForm issue={issue} mutateComments={mutateComments} />}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    content={comment.url}
                    title="Copy Comment URL"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />

                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    content={comment.body}
                    title="Copy Comment"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={mutateComments}
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

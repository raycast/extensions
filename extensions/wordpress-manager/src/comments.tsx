import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import {
  wp,
  useComments,
  WPComment,
  stripHtml,
  truncateText,
  getStatusIcon,
  getStatusLabel,
  formatRelativeDate,
  getEditCommentUrl,
} from "./utils";

type CommentStatus = "any" | "approved" | "hold" | "spam" | "trash";

export default function ModerateComments() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommentStatus>("hold");

  const {
    data: comments,
    isLoading,
    revalidate,
  } = useComments({
    search: searchText || undefined,
    status: statusFilter === "any" ? undefined : statusFilter,
    per_page: 30,
  });

  async function handleStatusChange(comment: WPComment, newStatus: "approved" | "hold" | "spam" | "trash") {
    const labels: Record<string, string> = {
      approved: "Approving",
      hold: "Unapproving",
      spam: "Marking as spam",
      trash: "Trashing",
    };

    await showToast({
      style: Toast.Style.Animated,
      title: `${labels[newStatus]}...`,
    });

    try {
      await wp.updateComment(comment.id, { status: newStatus });
      await showToast({
        style: Toast.Style.Success,
        title:
          newStatus === "approved"
            ? "Comment approved"
            : newStatus === "spam"
              ? "Marked as spam"
              : newStatus === "trash"
                ? "Moved to trash"
                : "Comment unapproved",
      });
      revalidate();
    } catch (error) {
      // Error handled by API
    }
  }

  async function handleDelete(comment: WPComment) {
    const confirmed = await confirmAlert({
      title: "Delete Comment Permanently?",
      message: "This comment will be permanently deleted. This cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting...",
    });

    try {
      await wp.deleteComment(comment.id, true);
      await showToast({
        style: Toast.Style.Success,
        title: "Comment deleted",
      });
      revalidate();
    } catch (error) {
      // Error handled by API
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search comments..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as CommentStatus)}
        >
          <List.Dropdown.Item title="Pending" value="hold" />
          <List.Dropdown.Item title="Approved" value="approved" />
          <List.Dropdown.Item title="Spam" value="spam" />
          <List.Dropdown.Item title="Trash" value="trash" />
          <List.Dropdown.Item title="All Comments" value="any" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Bubble}
        title="No comments found"
        description={statusFilter === "hold" ? "No comments waiting for moderation" : "No comments match your filters"}
      />

      {comments?.map((comment) => {
        const statusIcon = getStatusIcon(comment.status);
        const avatarUrl = comment.author_avatar_urls?.["48"] || comment.author_avatar_urls?.["24"];
        const postTitle = comment._embedded?.up?.[0]?.title?.rendered;

        return (
          <List.Item
            key={comment.id}
            title={comment.author_name || "Anonymous"}
            subtitle={truncateText(stripHtml(comment.content.rendered), 80)}
            icon={avatarUrl ? { source: avatarUrl, mask: Image.Mask.Circle } : Icon.Person}
            accessories={[
              postTitle ? { tag: { value: stripHtml(postTitle).substring(0, 20), color: Color.SecondaryText } } : {},
              { text: formatRelativeDate(comment.date) },
              { icon: statusIcon, tooltip: getStatusLabel(comment.status) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Quick Actions">
                  {comment.status !== "approved" && (
                    <Action
                      title="Approve"
                      icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                      onAction={() => handleStatusChange(comment, "approved")}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                    />
                  )}
                  {comment.status === "approved" && (
                    <Action title="Unapprove" icon={Icon.Circle} onAction={() => handleStatusChange(comment, "hold")} />
                  )}
                  {comment.status !== "spam" && (
                    <Action
                      title="Mark as Spam"
                      icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
                      onAction={() => handleStatusChange(comment, "spam")}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                    />
                  )}
                  {comment.status !== "trash" && (
                    <Action
                      title="Move to Trash"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleStatusChange(comment, "trash")}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  {comment.status === "trash" && (
                    <>
                      <Action
                        title="Restore"
                        icon={Icon.ArrowUp}
                        onAction={() => handleStatusChange(comment, "hold")}
                      />
                      <Action
                        title="Delete Permanently"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(comment)}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      />
                    </>
                  )}
                  {comment.status === "spam" && (
                    <Action title="Not Spam" icon={Icon.ArrowUp} onAction={() => handleStatusChange(comment, "hold")} />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="View Comment"
                    url={comment.link}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.OpenInBrowser
                    title="Edit in Wordpress"
                    url={getEditCommentUrl(comment.id)}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                  {comment._embedded?.up?.[0]?.link && (
                    <Action.OpenInBrowser title="View Post" url={comment._embedded.up[0].link} />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Comment Text"
                    content={stripHtml(comment.content.rendered)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {comment.author_email && (
                    <Action.CopyToClipboard title="Copy Author Email" content={comment.author_email} />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
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

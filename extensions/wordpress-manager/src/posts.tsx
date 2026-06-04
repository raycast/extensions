import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { PostForm } from "./components";
import {
  wp,
  usePosts,
  WPPost,
  getTitle,
  truncateText,
  getStatusIcon,
  getStatusLabel,
  formatRelativeDate,
  getEditPostUrl,
  getFeaturedImageUrl,
  getTermNames,
} from "./utils";

type PostStatus = "any" | "publish" | "draft" | "pending" | "private" | "trash";

export default function ManagePosts() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostStatus>("any");

  const {
    data: posts,
    isLoading,
    revalidate,
  } = usePosts({
    search: searchText || undefined,
    status: statusFilter === "any" ? undefined : statusFilter,
    per_page: 30,
  });

  async function handleStatusChange(post: WPPost, newStatus: "publish" | "draft" | "trash") {
    const actionName = newStatus === "publish" ? "Publishing" : newStatus === "trash" ? "Trashing" : "Saving as draft";

    await showToast({
      style: Toast.Style.Animated,
      title: `${actionName}...`,
    });

    try {
      await wp.updatePost(post.id, { status: newStatus });
      await showToast({
        style: Toast.Style.Success,
        title: newStatus === "publish" ? "Published" : newStatus === "trash" ? "Moved to trash" : "Saved as draft",
        message: getTitle(post),
      });
      revalidate();
    } catch (error) {
      // Error handled by API
    }
  }

  async function handleDelete(post: WPPost) {
    const confirmed = await confirmAlert({
      title: "Delete Post Permanently?",
      message: `"${getTitle(post)}" will be permanently deleted. This cannot be undone.`,
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
      await wp.deletePost(post.id, true);
      await showToast({
        style: Toast.Style.Success,
        title: "Post deleted",
        message: getTitle(post),
      });
      revalidate();
    } catch (error) {
      // Error handled by API
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search posts..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as PostStatus)}
        >
          <List.Dropdown.Item title="All Posts" value="any" />
          <List.Dropdown.Item title="Published" value="publish" />
          <List.Dropdown.Item title="Drafts" value="draft" />
          <List.Dropdown.Item title="Pending" value="pending" />
          <List.Dropdown.Item title="Private" value="private" />
          <List.Dropdown.Item title="Trash" value="trash" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Document}
        title="No posts found"
        description={searchText ? "Try a different search term" : "Create your first post"}
        actions={
          <ActionPanel>
            <Action.Push title="Create Post" icon={Icon.Plus} target={<PostForm onSuccess={() => revalidate()} />} />
          </ActionPanel>
        }
      />

      {posts?.map((post) => {
        const statusIcon = getStatusIcon(post.status);
        const featuredImage = getFeaturedImageUrl(post);
        const categories = getTermNames(post, "category");

        return (
          <List.Item
            key={post.id}
            title={getTitle(post)}
            subtitle={truncateText(post.excerpt.rendered, 60)}
            icon={featuredImage ? { source: featuredImage } : Icon.Document}
            accessories={[
              ...categories.slice(0, 2).map((cat) => ({ tag: { value: cat, color: Color.Blue } })),
              { text: formatRelativeDate(post.date) },
              { icon: statusIcon, tooltip: getStatusLabel(post.status) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="View Post" url={post.link} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                  <Action.Push
                    title="Edit Post"
                    icon={Icon.Pencil}
                    target={<PostForm post={post} onSuccess={() => revalidate()} />}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action.OpenInBrowser
                    title="Edit in Wordpress"
                    url={getEditPostUrl(post.id)}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  {post.status !== "publish" && (
                    <Action
                      title="Publish"
                      icon={Icon.CheckCircle}
                      onAction={() => handleStatusChange(post, "publish")}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                  )}
                  {post.status === "publish" && (
                    <Action
                      title="Unpublish (draft)"
                      icon={Icon.Circle}
                      onAction={() => handleStatusChange(post, "draft")}
                    />
                  )}
                  {post.status !== "trash" && (
                    <Action
                      title="Move to Trash"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleStatusChange(post, "trash")}
                    />
                  )}
                  {post.status === "trash" && (
                    <>
                      <Action title="Restore" icon={Icon.ArrowUp} onAction={() => handleStatusChange(post, "draft")} />
                      <Action
                        title="Delete Permanently"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(post)}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      />
                    </>
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={post.link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard title="Copy Title" content={getTitle(post)} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.Push
                    title="Create New Post"
                    icon={Icon.Plus}
                    target={<PostForm onSuccess={() => revalidate()} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
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

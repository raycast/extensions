import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import AuthenticatedView from "./components/authenticated-view";
import { fetchRecentLinks, markLinkAsRead, deleteLink } from "../lib/api";
import { API_URL } from "../lib/api-url";
import { authorize } from "../lib/oauth";
import { getHostname } from "../lib/get-hostname";

interface Link {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  isRead: boolean;
  domain?: string;
  author?: string;
  publicationDate?: string;
  createdTime?: string;
}

function ViewReadingList() {
  const [links, setLinks] = useState<Link[]>([]);

  const { data, error, isLoading } = useCachedPromise(
    async () => {
      const token = await authorize();
      const result = await fetchRecentLinks({ token, apiUrl: API_URL });

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch links");
      }

      // Filter to only show unread links
      return (result.links || []).filter((link) => !link.isRead);
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (data) {
      setLinks(data);
    }
  }, [data]);

  async function handleMarkAsRead(link: Link) {
    // Optimistic update - immediately remove from list and show success
    setLinks(links.filter((l) => l.id !== link.id));

    await showToast({
      style: Toast.Style.Success,
      title: "Marked as read",
    });

    // Mark as read in background
    try {
      const token = await authorize();
      const result = await markLinkAsRead({
        pageId: link.id,
        token,
        apiUrl: API_URL,
      });

      if (!result.success) {
        // If it failed, add the link back and show error
        setLinks((currentLinks) => [...currentLinks, link]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to mark as read",
          message: result.error || "Please try again",
        });
      }
    } catch (error) {
      // If it failed, add the link back and show error
      setLinks((currentLinks) => [...currentLinks, link]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to mark as read",
        message: "Please try again",
      });
    }
  }

  async function handleDelete(link: Link) {
    // Optimistic update - immediately remove from list and show success
    setLinks(links.filter((l) => l.id !== link.id));

    await showToast({
      style: Toast.Style.Success,
      title: "Link deleted",
    });

    // Delete in background
    try {
      const token = await authorize();
      const result = await deleteLink({
        pageId: link.id,
        token,
        apiUrl: API_URL,
      });

      if (!result.success) {
        // If it failed, add the link back and show error
        setLinks((currentLinks) => [...currentLinks, link]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete link",
          message: result.error || "Please try again",
        });
      }
    } catch (error) {
      // If it failed, add the link back and show error
      setLinks((currentLinks) => [...currentLinks, link]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete link",
        message: "Please try again",
      });
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Failed to load reading list" description={error.message} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search reading list...">
      {links.length === 0 && !isLoading ? (
        <List.EmptyView title="You're all caught up!" description="No unread links in Clippy" icon={Icon.CheckCircle} />
      ) : (
        links.map((link) => (
          <List.Item
            key={link.id}
            title={link.title}
            subtitle={getHostname(link.url)}
            icon={link.icon || Icon.Link}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Link" url={link.url} />
                <Action
                  title="Mark as Read"
                  icon={Icon.CheckCircle}
                  onAction={() => handleMarkAsRead(link)}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(link)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={link.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default function Command() {
  return <AuthenticatedView component={ViewReadingList} />;
}

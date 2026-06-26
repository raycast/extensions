import {
  Action,
  ActionPanel,
  Icon,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import type { AuthorFilter, Post } from "./types";

interface PostActionPanelProps {
  post: Post;
  read: boolean;
  primaryCat: { id: number; name: string } | undefined;
  categoryId: string;
  authorFilter: AuthorFilter | null;
  markRead: (id: number) => Promise<void>;
  markUnread: (id: number) => Promise<void>;
  setCategoryId: (id: string) => void;
  setAuthorFilter: (filter: AuthorFilter | null) => void;
  refresh: () => void;
}

export function PostActionPanel({
  post,
  read,
  primaryCat,
  categoryId,
  authorFilter,
  markRead,
  markUnread,
  setCategoryId,
  setAuthorFilter,
  refresh,
}: PostActionPanelProps) {
  const author = post._embedded?.author?.[0];

  return (
    <ActionPanel>
      <Action
        title="Open in Browser"
        icon={Icon.Globe}
        onAction={async () => {
          await markRead(post.id);
          await open(post.link);
        }}
      />
      <Action.CopyToClipboard
        title="Copy Link"
        content={post.link}
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />
      {read ? (
        <Action
          title="Mark as Unread"
          icon={Icon.Circle}
          onAction={() => markUnread(post.id)}
        />
      ) : (
        <Action
          title="Mark as Read"
          icon={Icon.CheckCircle}
          onAction={() => markRead(post.id)}
        />
      )}
      {primaryCat && categoryId !== String(primaryCat.id) && (
        <Action
          title={`Show Category: ${primaryCat.name}`}
          icon={Icon.Tag}
          onAction={() => {
            setAuthorFilter(null);
            setCategoryId(String(primaryCat.id));
          }}
        />
      )}
      {author && !authorFilter && (
        <Action
          title={`More from: ${author.name}`}
          icon={Icon.Person}
          onAction={() => setAuthorFilter({ id: author.id, name: author.name })}
        />
      )}
      {(authorFilter || categoryId !== "0") && (
        <Action
          title="Show All Posts"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            setAuthorFilter(null);
            setCategoryId("0");
          }}
        />
      )}
      <Action
        title="Refresh"
        icon={Icon.RotateClockwise}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={refresh}
      />
      <Action
        title="Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

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
        title="Otwórz w przeglądarce"
        icon={Icon.Globe}
        onAction={async () => {
          await markRead(post.id);
          await open(post.link);
        }}
      />
      <Action.CopyToClipboard
        title="Kopiuj link"
        content={post.link}
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />
      {read ? (
        <Action
          title="Oznacz jako nieprzeczytany"
          icon={Icon.Circle}
          onAction={() => markUnread(post.id)}
        />
      ) : (
        <Action
          title="Oznacz jako przeczytany"
          icon={Icon.CheckCircle}
          onAction={() => markRead(post.id)}
        />
      )}
      {primaryCat && categoryId !== String(primaryCat.id) && (
        <Action
          title={`Pokaż kategorię: ${primaryCat.name}`}
          icon={Icon.Tag}
          onAction={() => {
            setAuthorFilter(null);
            setCategoryId(String(primaryCat.id));
          }}
        />
      )}
      {author && !authorFilter && (
        <Action
          title={`Więcej od: ${author.name}`}
          icon={Icon.Person}
          onAction={() => setAuthorFilter({ id: author.id, name: author.name })}
        />
      )}
      {(authorFilter || categoryId !== "0") && (
        <Action
          title="Pokaż wszystkie wpisy"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            setAuthorFilter(null);
            setCategoryId("0");
          }}
        />
      )}
      <Action
        title="Odśwież"
        icon={Icon.RotateClockwise}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={refresh}
      />
      <Action
        title="Ustawienia rozszerzenia"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

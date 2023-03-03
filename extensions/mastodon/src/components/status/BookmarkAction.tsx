import { Action, Icon, showToast } from "@raycast/api";
import { mastodon } from "masto";
import { useState } from "react";

interface Props {
  bookmarked: boolean;
  id: string;
  masto: mastodon.Client | undefined;
}

export default function BookmarkAction({ bookmarked: providedBookmarked, id, masto }: Props) {
  const [bookmarked, setBookmarked] = useState(providedBookmarked);

  return (
    <Action
      title={bookmarked ? "Unbookmark" : "Bookmark"}
      icon={bookmarked ? Icon.DeleteDocument : Icon.Bookmark}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      onAction={async () => {
        if (bookmarked) await masto?.v1.statuses.unbookmark(id);
        else await masto?.v1.statuses.bookmark(id);
        showToast({ title: `Successfully ${bookmarked ? "removed from" : "added to"} your bookmarks!` });
        setBookmarked((v) => !v);
      }}
    />
  );
}

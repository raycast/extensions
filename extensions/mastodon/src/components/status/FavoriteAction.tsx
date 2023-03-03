import { Action, Icon, showToast } from "@raycast/api";
import { mastodon } from "masto";
import { useState } from "react";

interface Props {
  favorited: boolean;
  id: string;
  masto: mastodon.Client | undefined;
}

export default function FavoriteAction({ favorited: providedFavorited, id, masto }: Props) {
  const [favorited, setFavorited] = useState(providedFavorited);

  return (
    <Action
      title={favorited ? "Unfavorite" : "Favorite"}
      icon={favorited ? Icon.StarDisabled : Icon.Star}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      onAction={async () => {
        if (favorited) await masto?.v1.statuses.unfavourite(id);
        else await masto?.v1.statuses.favourite(id);
        showToast({ title: `Successfully ${favorited ? "removed from" : "added to"} your favorites!` });
        setFavorited((v) => !v);
      }}
    />
  );
}

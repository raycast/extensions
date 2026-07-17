import { ActionPanel, Action, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { setFavorite } from "../matterApi";
import { Item } from "../types";

export function Actions(props: { item: Item }) {
  const [isFavorited, setIsFavorited] = useState<boolean>(props.item.content.library.is_favorited);
  const entryURL = "https://web.getmatter.com/entry/";

  async function favorite(isFavorited: boolean) {
    try {
      const res = await setFavorite(String(props.item.content.id), true);
      if ("detail" in res) throw new Error();
      setIsFavorited(isFavorited);
      if (res.id && isFavorited) {
        showToast(Toast.Style.Success, "Success", "Article favorited");
      } else {
        showToast(Toast.Style.Success, "Success", "Artice removed from favorites");
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Error", "Something went wrong");
    }
  }

  return (
    <ActionPanel title={props.item.content.title}>
      <ActionPanel.Section>
        {/* OPEN IN MATTER */}
        {props.item.content.article && props.item.content.id && (
          <Action.OpenInBrowser icon="logo.png" url={entryURL + props.item.content.id} title="Open in Matter" />
        )}
        {/* View Original */}
        {props.item.content.url && <Action.OpenInBrowser url={props.item.content.url} title="View Original" />}
        {/* COPY LINK */}
        {props.item.content.url && (
          <Action.CopyToClipboard
            content={props.item.content.url}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
        {/* FAVORITE ARTICLE */}
        {props.item.content.id && !isFavorited && (
          <Action
            title="Add to Favorites"
            icon={Icon.Star}
            onAction={async () => {
              await showToast(Toast.Style.Animated, "Adding", props.item.content.title);
              favorite(true);
            }}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        )}
        {/* UNFAVORITE ARTICLE */}
        {props.item.content.id && isFavorited && (
          <Action
            title="Remove from Favorites"
            icon={Icon.StarDisabled}
            onAction={async () => {
              await showToast(Toast.Style.Animated, "Removing", props.item.content.title);
              favorite(false);
            }}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

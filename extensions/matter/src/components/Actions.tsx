import { ActionPanel, Action, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { setFavorite } from "../matterApi";

export function Actions(props: any) {
  const [isFavorited, setIsFavorited] = useState<boolean>(props.item.content.library.is_favorited);
  const entryURL = "https://web.getmatter.com/entry/";

  async function favorite(isFavorited: boolean) {
    try {
      const res: any = await setFavorite(props.item.content.id, true);
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
          <Action.OpenInBrowser url={entryURL + props.item.content.id} title="Open in Matter" />
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
            title="Add to favorites"
            icon={Icon.Star}
            onAction={async () => {
              await showToast(Toast.Style.Animated, "Loading");
              favorite(true);
            }}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        )}
        {/* UNFAVORITE ARTICLE */}
        {props.item.content.id && isFavorited && (
          <Action
            title="Remove from favorites"
            icon={Icon.StarDisabled}
            onAction={async () => {
              await showToast(Toast.Style.Animated, "Loading");
              favorite(false);
            }}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

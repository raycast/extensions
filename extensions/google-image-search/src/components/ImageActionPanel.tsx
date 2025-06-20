import { Action, ActionPanel } from "@raycast/api";
import { ImageDetails } from "./ImageDetails";
import { copyImageToClipboard, downloadImage } from "../utils/imageUtils";
import { Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { ImageActionPanelProps } from "../types";
import { addToFavorites, isImageFavorite, removeFromFavorites } from "../utils/favoritesUtils";

export function ImageActionPanel({ result, detail, searchText, onFavoriteToggle }: ImageActionPanelProps) {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    const checkFavorite = async () => {
      const favorite = await isImageFavorite(result.link);
      setIsFavorite(favorite);
    };
    checkFavorite();
  }, [result.link]);
  return (
    <ActionPanel>
      <Action title="Copy Image" icon={Icon.Clipboard} onAction={() => copyImageToClipboard(result.link)} />
      {!detail && (
        <Action.Push icon={Icon.AppWindowList} title="View Image Details" target={<ImageDetails item={result} />} />
      )}
      <ActionPanel.Section title="Image Actions">
        <Action
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={async () => {
            try {
              if (isFavorite) {
                await removeFromFavorites(result.link);
                await showToast({ style: Toast.Style.Success, title: "Removed from favorites" });
              } else {
                await addToFavorites(result);
                await showToast({ style: Toast.Style.Success, title: "Added to favorites" });
              }
              setIsFavorite(!isFavorite);

              // Call the onFavoriteToggle callback if provided
              if (onFavoriteToggle) {
                await onFavoriteToggle();
              }
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to update favorites",
                message: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }}
        />
        <Action.OpenInBrowser
          url={result.link}
          title="Open Image in Browser"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.OpenInBrowser
          url={`https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(searchText || "")}`}
          title="Search Google Images in Browser"
          shortcut={{ modifiers: ["cmd"], key: "g" }}
        />
        <Action.OpenInBrowser
          url={result.image.contextLink}
          title="Open Source in Browser"
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
        <Action
          title="Download Image"
          icon={Icon.ArrowDownCircle}
          onAction={() => downloadImage(result.link, result.title, result.mime || result.fileFormat)}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Actions">
        <Action.CopyToClipboard content={result.link} title="Copy Image URL" />
        <Action.CopyToClipboard content={result.image.contextLink} title="Copy Source URL" />
        <Action.CopyToClipboard content={result.title} title="Copy Title" />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

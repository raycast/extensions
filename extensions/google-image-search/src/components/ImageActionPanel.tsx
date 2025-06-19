import { Action, ActionPanel } from "@raycast/api";
import { ImageDetails } from "./ImageDetails";
import { copyImageToClipboard, downloadImage } from "../utils/imageUtils";
import { Icon } from "@raycast/api";
import { ImageActionPanelProps } from "../types";

export function ImageActionPanel({ result, detail, searchText }: ImageActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Image Actions">
        <Action
          title="Copy Image to Clipboard"
          icon={Icon.Clipboard}
          onAction={() => copyImageToClipboard(result.link)}
        />
        {!detail && (
          <Action.Push icon={Icon.AppWindowList} title="View Image Details" target={<ImageDetails item={result} />} />
        )}
        <Action.OpenInBrowser
          url={result.link}
          title="Open Image in Browser"
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
        <Action.OpenInBrowser
          url={`https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(searchText || "")}`}
          title="Search Google Images in Browser"
          shortcut={{ modifiers: ["cmd"], key: "g" }}
        />
        <Action.OpenInBrowser
          url={result.image.contextLink}
          title="Open Source in Browser"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
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

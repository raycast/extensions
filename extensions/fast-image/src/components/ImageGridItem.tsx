import { Action, ActionPanel, Grid, Icon, Image, Keyboard, openExtensionPreferences } from "@raycast/api";
import { pathToFileURL } from "url";
import { ImageFile } from "../types";

interface ImageGridItemProps {
  image: ImageFile;
  pdfThumbnail?: string;
  onUse: (path: string) => void;
  onRefresh: () => void;
}

// Grid.Item content is loaded like a browser <img>, which requires a proper file:// URL
// on Windows — a raw "S:\folder\file.png" path is not resolved as a local file source.
function toFileUrl(path: string): string {
  return pathToFileURL(path).href;
}

function getContent(image: ImageFile, pdfThumbnail?: string): Image.ImageLike {
  if (image.extension === "pdf") {
    return pdfThumbnail ? { source: toFileUrl(pdfThumbnail) } : Icon.Document;
  }
  return { source: toFileUrl(image.path) };
}

export function ImageGridItem({ image, pdfThumbnail, onUse, onRefresh }: ImageGridItemProps) {
  return (
    <Grid.Item
      id={image.path}
      title={image.name}
      content={getContent(image, pdfThumbnail)}
      quickLook={{ path: image.path, name: image.name }}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Image" content={{ file: image.path }} onPaste={() => onUse(image.path)} />
          <Action.CopyToClipboard title="Copy Image" content={{ file: image.path }} onCopy={() => onUse(image.path)} />
          <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
          <Action.ShowInFinder path={image.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
          <ActionPanel.Section>
            <Action
              title="Refresh Images List"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
            <Action
              title="Change Images Folder"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

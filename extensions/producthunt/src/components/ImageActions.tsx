import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { failureToast } from "../util/toast";
import { execSync } from "child_process";
import { basename } from "path";
import { homedir } from "os";
import fs from "fs";
import path from "path";

interface ImageActionsProps {
  imageUrl: string;
  showAsSubmenu?: boolean;
}

export function ImageActions({ imageUrl, showAsSubmenu = false }: ImageActionsProps) {
  // Function to download the image
  const downloadImage = async () => {
    try {
      // Create Downloads directory if it doesn't exist
      const downloadsDir = path.join(homedir(), "Downloads");
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
      }

      // Generate a filename based on the image URL
      const filename = basename(imageUrl).split("?")[0] || `image-${Date.now()}.jpg`;
      const filepath = path.join(downloadsDir, filename);

      // Download the image using curl
      execSync(`curl -s "${imageUrl}" -o "${filepath}"`);

      showToast({
        style: Toast.Style.Success,
        title: "Image downloaded",
        message: `Saved to ${filepath}`,
      });
    } catch (error) {
      console.error("Error downloading image:", error);
      await failureToast("Failed to download image", error);
    }
  };

  // Create the actions
  const actions = [
    <Action.OpenInBrowser
      key="open-in-browser"
      url={imageUrl}
      title="Open in Browser"
      icon={Icon.Globe}
      shortcut={Keyboard.Shortcut.Common.Open}
    />,
    <Action.CopyToClipboard
      key="copy-url"
      content={imageUrl}
      title="Copy Image URL"
      shortcut={Keyboard.Shortcut.Common.Copy}
    />,
    <Action.Paste
      key="copy-markdown"
      content={`![](${imageUrl})`}
      title="Copy Markdown"
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "m" },
        Windows: { modifiers: ["ctrl", "shift"], key: "m" },
      }}
    />,
    <Action
      key="download"
      title="Download Image"
      icon={Icon.Download}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "d" },
        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
      }}
      onAction={downloadImage}
    />,
  ];

  // If showing as submenu, return a submenu action
  if (showAsSubmenu) {
    return (
      <ActionPanel.Submenu
        title="Image Actions"
        icon={Icon.Image}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
      >
        {actions}
      </ActionPanel.Submenu>
    );
  }

  // Otherwise, return the individual actions
  return <>{actions}</>;
}

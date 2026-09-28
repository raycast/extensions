import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { ReactNode } from "react";
import { attribution, MUSEUM_URL, type Artwork } from "../lib/artworks";
import { copyImage, downloadImage, setWallpaper } from "../lib/images";

async function perform(title: string, success: string, action: () => Promise<unknown>) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const result = await action();
    toast.style = Toast.Style.Success;
    toast.title = success;
    if (typeof result === "string")
      toast.primaryAction = { title: "Show Download", onAction: () => showInFinder(result) };
  } catch (error) {
    toast.hide();
    await showFailureToast(error, { title: `Could not ${title.toLowerCase().replace(/\.\.\.$/, "")}` });
  }
}

export function ArtworkActions({
  artwork,
  onShowDetails,
  onSearchColor,
  extraActions,
}: {
  artwork: Artwork;
  onShowDetails?: () => void;
  onSearchColor: (hex: string) => void;
  extraActions?: ReactNode;
}) {
  const details = onShowDetails ? (
    <Action key="details" title="Show Details" icon={Icon.Sidebar} onAction={onShowDetails} />
  ) : undefined;
  const copy = (
    <Action
      key="copy"
      title="Copy Image"
      icon={Icon.Clipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={() => perform("Copy image...", "Image copied", () => copyImage(artwork))}
    />
  );
  const source = <Action.OpenInBrowser key="source" title="Open Source Page" url={artwork.sourceUrl} />;
  const preference = getPreferenceValues<Preferences>().defaultAction;
  const primary =
    preference === "copy"
      ? [copy, details, source]
      : preference === "source"
        ? [source, details, copy]
        : [details, copy, source];
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {primary}
        {extraActions}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Download Image"
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() => perform("Download image...", "Saved to Downloads", () => downloadImage(artwork))}
        />
        {process.platform === "darwin" && (
          <Action
            title="Set as Wallpaper"
            icon={Icon.Desktop}
            onAction={() => perform("Set wallpaper...", "Wallpaper updated", () => setWallpaper(artwork))}
          />
        )}
        <Action.CopyToClipboard title="Copy Palette" content={artwork.palette.map((color) => color.hex).join(", ")} />
        <Action.CopyToClipboard title="Copy Attribution" content={attribution(artwork)} />
        <Action.OpenInBrowser title="Open in Museum" url={MUSEUM_URL} />
      </ActionPanel.Section>
      <ActionPanel.Submenu title="Search Palette Color" icon={Icon.EyeDropper}>
        {artwork.palette.map((color, index) => (
          <Action
            key={`${color.hex}-${index}`}
            title={`Search ${color.hex} (${color.share}%)`}
            icon={{ source: Icon.CircleFilled, tintColor: color.hex }}
            onAction={() => onSearchColor(color.hex)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title="Copy Palette Color" icon={Icon.Clipboard}>
        {artwork.palette.map((color, index) => (
          <Action.CopyToClipboard
            key={`${color.hex}-${index}`}
            title={`${color.hex} (${color.share}%)`}
            content={color.hex}
            icon={{ source: Icon.CircleFilled, tintColor: color.hex }}
          />
        ))}
      </ActionPanel.Submenu>
    </ActionPanel>
  );
}

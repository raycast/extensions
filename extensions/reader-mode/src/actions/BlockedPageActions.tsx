import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { BrowserTab } from "../types/browser";

interface BlockedPageActionsProps {
  blockedUrl: string;
  hasBrowserExtension: boolean;
  foundTab: BrowserTab | null;
  onFetchFromBrowser: () => void;
}

export function BlockedPageActions({
  blockedUrl,
  hasBrowserExtension,
  foundTab,
  onFetchFromBrowser,
}: BlockedPageActionsProps) {
  return (
    <ActionPanel>
      {hasBrowserExtension && (
        <>
          <Action.OpenInBrowser
            title={foundTab ? "Switch to Tab" : "Open in Browser"}
            url={blockedUrl}
            icon={foundTab ? Icon.ArrowRight : Icon.Globe}
          />
          <Action
            title="Fetch Content from Browser"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onFetchFromBrowser}
          />
        </>
      )}
      {!hasBrowserExtension && (
        <Action.OpenInBrowser
          title="Get Raycast Browser Extension"
          url="https://www.raycast.com/browser-extension"
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      )}
      <Action.CopyToClipboard title="Copy URL" content={blockedUrl} shortcut={Keyboard.Shortcut.Common.Copy} />
    </ActionPanel>
  );
}

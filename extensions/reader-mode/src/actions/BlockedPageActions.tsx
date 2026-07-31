import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { BrowserTab } from "../types/browser";
import { isWindows } from "../utils/host-api";

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
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onFetchFromBrowser}
          />
        </>
      )}
      {!hasBrowserExtension && (
        <>
          <Action.OpenInBrowser title="Open in Browser" url={blockedUrl} icon={Icon.Globe} />
          {/* The browser extension does not exist on Windows, so offering to install it
              would send the reader to a page with nothing on it for them. */}
          {!isWindows && (
            <Action.OpenInBrowser
              title="Get Raycast Browser Extension"
              url="https://www.raycast.com/browser-extension"
              icon={Icon.Download}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          )}
        </>
      )}
      <Action.CopyToClipboard title="Copy URL" content={blockedUrl} shortcut={Keyboard.Shortcut.Common.Copy} />
    </ActionPanel>
  );
}

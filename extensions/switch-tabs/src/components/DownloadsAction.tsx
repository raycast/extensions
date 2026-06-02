import { Action, Icon, Color } from "@raycast/api";
import { DownloadsView } from "./DownloadsView";
import { getActionShortcut } from "../helpers";
import { DownloadItem, BridgeMessage } from "../types";

interface DownloadsActionProps {
  downloads: DownloadItem[];
  sendToSocket?: (msg: BridgeMessage) => void;
  windowTarget?: string;
  browserFilter: string;
  requestData?: (channel: string) => void;
  onClose?: () => void;
}

export function DownloadsAction({
  downloads,
  browserFilter,
  windowTarget,
  sendToSocket,
  requestData,
  onClose,
}: DownloadsActionProps) {
  const title =
    browserFilter === "all"
      ? "Downloads"
      : `${browserFilter.charAt(0).toUpperCase() + browserFilter.slice(1)} Downloads`;

  return (
    <Action.Push
      title={title}
      icon={{ source: Icon.Download, tintColor: Color.Yellow }}
      shortcut={getActionShortcut("downloads") || { modifiers: ["shift"], key: "tab" }}
      target={
        <DownloadsView
          downloads={downloads}
          title={title}
          browserFilter={browserFilter}
          windowFilter={windowTarget}
          sendToSocket={sendToSocket || (() => {})}
          requestData={requestData}
          onClose={onClose}
        />
      }
    />
  );
}

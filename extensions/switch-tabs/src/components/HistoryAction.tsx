import React from "react";
import { Action, Icon, Color } from "@raycast/api";
import { BrowserHistoryView } from "./HistoryView";
import { getActionShortcut } from "../helpers";
import { DisplayTab, BridgeMessage } from "../types";

interface HistoryActionProps {
  browserFilter: string;
  windowTarget?: string;
  sendToSocket?: (msg: BridgeMessage) => void;
  requestData?: (channel: string) => void;
  navigateCurrentTab: (url: string, tabs: DisplayTab[]) => void;
  allTabs?: DisplayTab[];
  onClose?: () => void;
}

export function HistoryAction({
  browserFilter,
  windowTarget,
  sendToSocket,
  requestData,
  navigateCurrentTab,
  allTabs,
  onClose,
}: HistoryActionProps) {
  const title =
    browserFilter === "all"
      ? "Browser History"
      : `${browserFilter.charAt(0).toUpperCase() + browserFilter.slice(1)} History`;

  const historyIcon = { source: Icon.Clock, tintColor: Color.Yellow };

  return (
    <Action.Push
      title={title}
      icon={historyIcon}
      shortcut={
        getActionShortcut("history") || { modifiers: ["ctrl"], key: "h" }
      }
      target={
        <BrowserHistoryView
          title={title}
          browserFilter={browserFilter}
          windowFilter={windowTarget}
          sendToSocket={sendToSocket}
          requestData={requestData}
          navigateCurrentTab={navigateCurrentTab}
          allTabs={allTabs}
          onClose={onClose}
        />
      }
    />
  );
}

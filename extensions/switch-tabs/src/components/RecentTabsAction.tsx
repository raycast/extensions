import React from "react";
import { Action, Icon, Color } from "@raycast/api";
import { SessionsView } from "./SessionsView";
import { getActionShortcut } from "../helpers";
import { DisplayTab, BridgeMessage } from "../types";

interface RecentTabsActionProps {
  browserFilter: string;
  sendToSocket?: (msg: BridgeMessage) => void;
  windowTarget?: string;
  requestData?: (channel: string) => void;
  navigateCurrentTab: (url: string, tabs: DisplayTab[]) => void;
  allTabs?: DisplayTab[];
  onClose?: () => void;
}

export function SessionsAction({
  browserFilter,
  sendToSocket,
  windowTarget,
  requestData,
  navigateCurrentTab,
  allTabs,
  onClose,
}: RecentTabsActionProps) {
  const title =
    browserFilter === "all"
      ? "Recently Closed Tabs"
      : `${browserFilter.charAt(0).toUpperCase() + browserFilter.slice(1)} Closed Tabs`;

  return (
    <Action.Push
      title={title}
      icon={{ source: Icon.ArrowCounterClockwise, tintColor: Color.Yellow }}
      shortcut={
        getActionShortcut("sessions") || { modifiers: ["alt"], key: "x" }
      }
      target={
        <SessionsView
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

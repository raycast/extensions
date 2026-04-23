import React from "react";
import {
  Action,
  ActionPanel,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { openCommand } from "../lib/navigation";

interface NoesisActionPanelProps {
  children?: React.ReactNode;
  onRefresh?: (force?: boolean) => Promise<void> | void;
  refreshTitle?: string;
  hideDashboardAction?: boolean;
}

export function NoesisActionPanel({
  children,
  onRefresh,
  refreshTitle = "Refresh Snapshot",
  hideDashboardAction = false,
}: NoesisActionPanelProps) {
  return (
    <ActionPanel>
      {children}
      <ActionPanel.Section>
        {onRefresh ? (
          <Action
            title={refreshTitle}
            icon={Icon.ArrowClockwise}
            onAction={() => onRefresh(true)}
          />
        ) : null}
        {!hideDashboardAction ? (
          <Action
            title="Open Dashboard"
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => openCommand("dashboard")}
          />
        ) : null}
        <Action
          title="Edit Access Key"
          icon={Icon.Key}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => openCommand("api-key")}
        />
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

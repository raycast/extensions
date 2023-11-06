import { Action, ActionPanel, Icon } from "@raycast/api";
import React from "react";
import { runSimulator, shutdownSimulator } from "../utils";

export default function ItemActionPanel(props: {
  identifier: string;
  selectedDeviceId?: string;
  showImage: boolean;
  onToggleDetails: (identifier?: string) => void;
  onToggleImage: (visible: boolean) => void;
  simulatorId?: string;
}) {
  const { identifier, selectedDeviceId, showImage, simulatorId, onToggleDetails, onToggleImage } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Device">
        <Action
          icon={Icon.Info}
          title={selectedDeviceId !== identifier ? "Show Details" : "Close Details"}
          onAction={() => onToggleDetails(selectedDeviceId !== identifier ? identifier : undefined)}
        />
        <Action
          icon={Icon.Image}
          title={showImage ? "Hide Image" : "Show Image"}
          onAction={() => onToggleImage(!showImage)}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
      </ActionPanel.Section>
      {simulatorId && (
        <ActionPanel.Section title="Simulator">
          <Action
            icon={Icon.Play}
            title="Open Simulator"
            onAction={() => runSimulator(simulatorId)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action
            icon={Icon.XMarkCircle}
            title="Shutdown Simulator"
            onAction={() => shutdownSimulator(simulatorId)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

import { Action, Icon, launchCommand, LaunchType } from "@raycast/api";
import React from "react";

export function ActionLaunchPin() {
  return (
    <Action
      icon={Icon.Tack}
      title={`Pin`}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={async () => {
        await launchCommand({ name: "pin", type: LaunchType.UserInitiated });
      }}
    />
  );
}

import { Action, Icon } from "@raycast/api";
import { useStreamerMode } from "../utils/useStreamerMode";

export function StreamerModeAction() {
  const { isEnabled, toggle } = useStreamerMode();

  return (
    <Action
      title={isEnabled ? "Disable Streamer Mode" : "Enable Streamer Mode"}
      icon={isEnabled ? Icon.Eye : Icon.EyeDisabled}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
      onAction={toggle}
    />
  );
}

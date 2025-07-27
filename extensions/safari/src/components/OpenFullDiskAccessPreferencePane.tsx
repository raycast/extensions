import { Action, Icon } from "@raycast/api";

export default function OpenFullDiskAccessPreferencePaneAction() {
  return (
    <Action.Open
      title="Open System Preferences"
      icon={Icon.Gear}
      target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
    />
  );
}

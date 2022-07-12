import { Icon, Action } from "@raycast/api";

const OpenFullDiskAccessPreferencePaneAction = () => (
  <Action.Open
    title="Open System Preferences"
    icon={Icon.Gear}
    target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
  />
);

export default OpenFullDiskAccessPreferencePaneAction;

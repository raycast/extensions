import { Icon, OpenAction } from "@raycast/api";

const OpenFullDiskAccessPreferencePaneAction = () => (
  <OpenAction
    title="Open System Preferences"
    icon={Icon.Gear}
    target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
  />
);

export default OpenFullDiskAccessPreferencePaneAction;

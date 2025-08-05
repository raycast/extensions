import { Icon, List } from "@raycast/api";

export const Offline = () => {
  return (
    <List.EmptyView
      title="Offline"
      description="You are currently offline, please check your internet connection."
      icon={Icon.WifiDisabled}
    />
  );
};

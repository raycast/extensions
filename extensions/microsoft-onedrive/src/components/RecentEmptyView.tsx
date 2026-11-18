import { Color, List } from "@raycast/api";

export function RecentEmptyView() {
  return (
    <List.EmptyView
      icon={{ source: "icons/onedrive.svg", tintColor: Color.SecondaryText }}
      title="Recent files not available"
      description="This command is only available for Microsoft 365 work or school accounts."
    />
  );
}

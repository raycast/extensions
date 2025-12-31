import { List, Icon } from "@raycast/api";

export function EmptyView() {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="No Data Views Found"
      description="Run 'Refresh data-views' command to fetch data views"
    />
  );
}

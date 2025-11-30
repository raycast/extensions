import { List } from "@raycast/api";
import { TabListItem } from "./components/TabListItem";
import { useTabs } from "./dia";

export default function Command() {
  const { isLoading, data, revalidate } = useTabs();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tabs...">
      {data?.map((tab, index) => (
        <TabListItem key={`${tab.windowId}-${tab.tabId}-${index}`} tab={tab} onTabAction={revalidate} />
      ))}
    </List>
  );
}

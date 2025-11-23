import { List } from "@raycast/api";
import { useTabs } from "./dia";
import { TabListItem } from "./components/TabListItem";

export default function Command() {
  const { isLoading, data } = useTabs();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tabs...">
      {data?.map((tab, index) => <TabListItem key={`${tab.windowId}-${tab.tabId}-${index}`} tab={tab} />)}
    </List>
  );
}

import { List } from "@raycast/api";
import { TabListItem } from "./components/TabListItem";
import withVersionCheck from "./components/VersionCheck";
import { useTabs } from "./dia";

function Command() {
  const { isLoading, data, revalidate, mutate } = useTabs();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tabs...">
      {data?.map((tab, index) => (
        <TabListItem
          key={`${tab.windowId}-${tab.tabId}-${index}`}
          tab={tab}
          onTabAction={revalidate}
          mutateTabs={mutate}
        />
      ))}
    </List>
  );
}

export default withVersionCheck(Command);

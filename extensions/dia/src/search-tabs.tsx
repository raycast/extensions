import { List } from "@raycast/api";
import { TabListItem } from "./components/TabListItem";
import withVersionCheck from "./components/VersionCheck";
import { useTabs } from "./dia";
import { hasMultipleProfiles } from "./utils";

function Command() {
  const { isLoading, data, revalidate, mutate } = useTabs();

  const showProfile = hasMultipleProfiles(data);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tabs...">
      {data?.map((tab, index) => (
        <TabListItem
          key={`${tab.windowId}-${tab.profileIndex}-${tab.tabId}-${index}`}
          tab={tab}
          onTabAction={revalidate}
          mutateTabs={mutate}
          showProfile={showProfile}
        />
      ))}
    </List>
  );
}

export default withVersionCheck(Command);

import { List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { TabList, TabTypeDropdown } from "./components";
import { COMMAND_NAME, TAB_TYPE } from "./constants";
import { useMozeidonTabs } from "./hooks/useMozeidon";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>("");
  const [
    {
      data: { tabs, type },
      isLoading,
      errorView,
    },
    changeTabType,
    setData,
  ] = useMozeidonTabs();

  if (errorView) return errorView as ReactElement;
  return (
    <List
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearchText}
      filtering={{ keepSectionOrder: true }}
      navigationTitle={COMMAND_NAME}
      searchBarAccessory={TabTypeDropdown({
        tabTypes: [
          /*
          prevent user from changing dropdown item while bookmarks are loading
          this would mess up with mozeidon which cannot handle concurrency
          */
          !isLoading ? { id: "1", name: TAB_TYPE.OPENED_TABS } : undefined,
          !isLoading ? { id: "2", name: TAB_TYPE.RECENTLY_CLOSED } : undefined,
          { id: "3", name: TAB_TYPE.BOOKMARKS },
        ],
        onTabTypeChange: async (value) => {
          if (isLoading) return;
          await changeTabType(value as TAB_TYPE);
        },
      })}
    >
      <List.Section title={`${tabs.length} ${type}`}>
        {tabs.map((tab) => (
          <TabList.TabItem
            isLoading={isLoading}
            type={type}
            tab={tab}
            key={tab.id.toString()}
            onCloseTab={
              type === TAB_TYPE.OPENED_TABS
                ? () =>
                    // when an opened-tab is closed by the user, remove it from the state.
                    setData({
                      type: TAB_TYPE.OPENED_TABS,
                      tabs: tabs.filter((t) => `${t.windowId}${t.id}` !== `${tab.windowId}${tab.id}`),
                    })
                : undefined
            }
          />
        ))}
      </List.Section>
      <List.Section title="New Tab">
        <TabList.NewTabItem searchText={searchText} />
      </List.Section>
    </List>
  );
}

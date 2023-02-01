import { List } from "@raycast/api";
import { useContext } from "react";
import { ChromeListItems } from "./components";
import { TabsContext, TabsProvider } from "./contexts/TabsContext";

function MainList() {
  const { tabs, useOriginalFavicon } = useContext(TabsContext);

  return (
    <List isLoading={tabs.length === 0}>
      {tabs.map((tab) => (
        <ChromeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <TabsProvider>
      <MainList />
    </TabsProvider>
  );
}

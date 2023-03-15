import { getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Preferences, Tab } from "./interfaces";
import { getOpenTabs } from "./actions";
import { EdgeListItems } from "./components";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [tabs, setTabs] = useState<Tab[]>([]);

  useEffect(() => {
    async function getTabs() {
      setTabs(await getOpenTabs(useOriginalFavicon));
    }
    getTabs().then();
  }, []);

  return (
    <List isLoading={tabs.length === 0}>
      {tabs.map((tab) => (
        <EdgeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}

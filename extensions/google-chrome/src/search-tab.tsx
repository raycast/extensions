import { getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Preferences, Tab } from "./interfaces";
import { getOpenTabs } from "./actions";
import { ChromeListItems } from "./components";

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [tabs, setTabs] = useState<Tab[]>([]);

  useEffect(() => {
    getOpenTabs(useOriginalFavicon).then(setTabs);
  }, []);

  return (
    <List isLoading={tabs.length === 0}>
      {tabs.map((tab) => (
        <ChromeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}

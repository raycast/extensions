import { useState } from "react";
import { List } from "@raycast/api";

import useTabs from "src/hooks/useTabs";
import { Tab } from "./types";
import { search } from "./utils";
import TabListItem from "src/components/TabListItem";

const Command = () => {
  const { tabs, refresh } = useTabs();
  const [searchText, setSearchText] = useState<string>("");

  return (
    <List isLoading={!tabs} onSearchTextChange={setSearchText}>
      {search(tabs ?? [], ["title", "url"], searchText).map((tab: Tab) => {
        return <TabListItem tab={tab} key={tab.url} refresh={refresh} />;
      })}
    </List>
  );
};

export default Command;

import { getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Tab } from "./lib/Tab";
import { TabListItem } from "./components/TabListItem";
import { getOpenTabs } from "./common/getOpenTabs";

interface State {
  tabs?: Tab[];
}

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();

  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function getTabs() {
      setState({ tabs: await getOpenTabs(useOriginalFavicon) });
    }

    getTabs();
  }, []);

  return (
    <List>
      {state.tabs?.map((tab) => (
        <TabListItem key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}

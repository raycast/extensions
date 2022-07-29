import { checkIfBrowserIsInstalled } from "./utils/appleScriptUtils";
import { DEFAULT_ERROR_TITLE, EDGE_NOT_INSTALLED_MESSAGE } from "./common/constants";
import { getOpenTabs } from "./common/getOpenTabs";
import { getPreferenceValues, List, showToast, ToastStyle } from "@raycast/api";
import { NotInstalled } from "./components/NotInstalled";
import { Tab } from "./lib/Tab";
import { TabListItem } from "./components/TabListItem";
import { useEffect, useState } from "react";

interface State {
  tabs?: Tab[];
  error?: boolean;
}

let isEdgeInstalled = true;

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();

  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function getTabs() {
      try {
        const tabs = await getOpenTabs(useOriginalFavicon);
        setState({ tabs, error: false });
      } catch (error) {
        isEdgeInstalled = await checkIfBrowserIsInstalled();
        setState({ tabs: [], error: !isEdgeInstalled });
        showToast(
          ToastStyle.Failure,
          DEFAULT_ERROR_TITLE,
          isEdgeInstalled ? "Failed to show open tabs" : EDGE_NOT_INSTALLED_MESSAGE
        );
      }
    }

    getTabs();
  }, []);

  if (state.error) {
    return <NotInstalled />;
  }

  return (
    <List>
      {state.tabs?.map((tab) => (
        <TabListItem key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}

import { Detail, getPreferenceValues, List, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { Tab } from "./lib/Tab";
import { TabListItem } from "./components/TabListItem";
import { getOpenTabs } from "./common/getOpenTabs";
import { DEFAULT_ERROR_TITLE, DownloadMSEdgeMDText } from "./common/constants";

interface State {
  tabs?: Tab[];
  error?: boolean;
}

export default function Command() {
  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();

  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function getTabs() {
      try {
        const tabs = await getOpenTabs(useOriginalFavicon);
        setState({ tabs });
      } catch (error) {
        setState({ error: true, tabs: [] });
        const errorMessage = (error as Error).message.includes("execution error")
          ? "Microsoft Edge not installed"
          : "Tabs not found";
        showToast(ToastStyle.Failure, DEFAULT_ERROR_TITLE, errorMessage);
      }
    }

    getTabs();
  }, []);

  if (state.error) {
    return <Detail navigationTitle="Download Microsoft Edge" markdown={DownloadMSEdgeMDText} />;
  }

  return (
    <List>
      {state.tabs?.map((tab) => (
        <TabListItem key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}

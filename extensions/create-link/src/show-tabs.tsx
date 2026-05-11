import { showHUD, BrowserExtension, List } from "@raycast/api";
import { isExtensionInstalled, getTabs } from "./utils/browser";
import TabList from "./components/TabList";
import { Suspense, useEffect, useState } from "react";

async function checkExtension() {
  if (!isExtensionInstalled()) {
    await showHUD("Extension not installed");
    return false;
  }
  return true;
}

export default function ShowTabs() {
  const [tabs, setTabs] = useState<BrowserExtension.Tab[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const isExtensionOk = await checkExtension();
      if (isExtensionOk) {
        const tabData = await getTabs();
        setTabs(tabData);
      }
      setIsLoading(false);
    };

    initialize();
  }, []);

  return (
    <Suspense fallback={<List isLoading={isLoading}>Loading...</List>}>
      {!isLoading && tabs.length === 0 ? (
        <List>
          <List.EmptyView title="No tabs found" />
        </List>
      ) : (
        <TabList tabs={tabs} />
      )}
    </Suspense>
  );
}

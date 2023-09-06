import { useCachedPromise } from "@raycast/utils";

import { Tab } from "../types";
import { executeJxa, getOrionAppIdentifier } from "../utils";

const fetchLocalTabs = (): Promise<Tab[]> =>
  executeJxa(`
    const orion = Application("${getOrionAppIdentifier()}");
    const tabs = [];
    orion.windows().forEach(window => {
      const windowTabs = window.tabs();
      if (windowTabs) {
        windowTabs.forEach(tab => {
          if (!tabs.find(existingTab => existingTab.url === tab.url())) {
            tabs.push({
              title: tab.name(),
              url: tab.url() || '',
              window_id: window.id(),
            });
          }
        })
      }
    });
    return tabs;
`);

const useLocalTabs = () => useCachedPromise(fetchLocalTabs, [], { keepPreviousData: true });

const useTabs = () => {
  const tabs = useLocalTabs();
  return { tabs: tabs.data, refresh: tabs.revalidate };
};

export default useTabs;

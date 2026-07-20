import { useCachedPromise } from "@raycast/utils";

import { Tab } from "../types";
import { executeJxa, getOrionAppIdentifier } from "../utils";

async function fetchLocalTabs(): Promise<Tab[]> {
  const res = await executeJxa(`
    const orion = Application("${getOrionAppIdentifier()}");
    const tabs = [];
    const seen = {};
    orion.windows().forEach(window => {
      const windowId = window.id();
      // Orion's scripting bridge fails when reading 'URL'/'name' from the tab
      // objects returned by window.tabs(), but bulk property access on the tab
      // collection (window.tabs.url() / .name()) works, so read them that way.
      let urls, names;
      try {
        urls = window.tabs.url();
        names = window.tabs.name();
      } catch (e) {
        return;
      }
      const count = Math.min(urls.length, names.length);
      for (let i = 0; i < count; i++) {
        const url = urls[i] || '';
        if (!seen[url]) {
          seen[url] = true;
          tabs.push({
            title: names[i],
            url: url,
            window_id: windowId,
          });
        }
      }
    });
    tabs
  `);
  return res ? (JSON.parse(res) as Tab[]) : [];
}

const useLocalTabs = () => useCachedPromise(fetchLocalTabs, [], { keepPreviousData: true });

const useTabs = () => {
  const tabs = useLocalTabs();
  return { tabs: tabs.data, refresh: tabs.revalidate };
};

export default useTabs;

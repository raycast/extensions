import { getPreferenceValues } from "@raycast/api";
import { createContext, FC, ReactNode, useCallback, useEffect, useState } from "react";
import { getOpenTabs } from "../actions";
import { Tab, Preferences } from "../interfaces";

interface TabsOptions {
  useOriginalFavicon: boolean;
  tabs: Tab[];
  /**
   * Need to resync tabs after if activate a tab among multiple, because the
   * window index of it might be invalid.
   */
  syncTabs: () => Promise<void>;
}

export const TabsContext = createContext<TabsOptions>({
  tabs: [],
  syncTabs: () => Promise.resolve(),
  useOriginalFavicon: getPreferenceValues<Preferences>().useOriginalFavicon,
});

interface Props {
  children: ReactNode;
}

export const TabsProvider: FC<Props> = ({ children }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  const syncTabs = useCallback(async () => {
    const openTabs = await getOpenTabs(useOriginalFavicon);
    setTabs(openTabs);
  }, []);

  useEffect(() => {
    syncTabs();
  }, [syncTabs]);

  return <TabsContext.Provider value={{ tabs, syncTabs, useOriginalFavicon }}>{children}</TabsContext.Provider>;
};

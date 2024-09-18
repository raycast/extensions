import { SearchResult, TabState } from "../interfaces";
import { useState, Dispatch, SetStateAction, ReactElement, useEffect } from "react";
import { TAB_TYPE } from "../constants";
import { fetchOpenTabs, fetchRecentlyClosedTabs, getBookmarksChunks, isFirefoxRunning, startFirefox } from "../actions";
import { UnknownError } from "../components/Error";
import { closeMainWindow, PopToRootType } from "@raycast/api";

/*
use TAB.TYPE.NONE as initial state
to ensure that the dropdown `storeValue` is correctly working.
See `storeValue` in `src/components/TabTypeDropDown.tsx`
*/
let tabState: TabState = { type: TAB_TYPE.NONE, tabs: [] };

export function useMozeidonTabs(): [
  SearchResult<TabState>,
  (chosenType?: TAB_TYPE) => Promise<void>,
  Dispatch<SetStateAction<TabState>>,
] {
  const [data, setData] = useState<TabState>(tabState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactElement | undefined>();

  useEffect(() => {
    const check = async () => {
      setIsLoading(true);
      const isBrowserRunning = await isFirefoxRunning();
      if (isBrowserRunning) {
        setIsLoading(false);
      } else {
        await startFirefox();
        await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      }
    };

    try {
      check();
    } catch (error) {
      setErrorView(<UnknownError />);
    }
  }, []);

  async function changeTabType(chosenType?: TAB_TYPE) {
    if (isLoading) return;
    try {
      switch (chosenType) {
        case TAB_TYPE.OPENED_TABS:
          tabState = fetchOpenTabs();
          setData(tabState);
          break;
        case TAB_TYPE.RECENTLY_CLOSED:
          tabState = fetchRecentlyClosedTabs();
          setData(tabState);
          break;
        case TAB_TYPE.BOOKMARKS:
          /*
        do not fetch if already fetched
        */
          if (tabState.type === TAB_TYPE.BOOKMARKS) break;
          setIsLoading(true);
          tabState = { type: TAB_TYPE.BOOKMARKS, tabs: [] };
          for await (const chunk of getBookmarksChunks()) {
            tabState.tabs.push(...chunk);
            /* 
          copy a new tabState
          to make the reactive component using this hook
          progressively load bookmarks chunk by chunk.
          */
            setData({ ...tabState });
          }
          setIsLoading(false);
          break;
        default:
          break;
      }
    } catch (error) {
      setErrorView(<UnknownError />);
    }
  }

  return [{ data, isLoading, errorView }, changeTabType, setData];
}

import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { SizeTheme, HistoryItem } from "./types";

const MAX_HISTORY_ITEMS = 10;

export function useHistory() {
  const [history, setHistory] = useCachedState<HistoryItem[]>("history", []);

  return {
    history,

    remove: (item: HistoryItem) =>
      setHistory((previousHistory: any) => {
        return previousHistory.filter((value: any) => value !== item.data.value);
      }),
    add: (item: HistoryItem) => {
      const historyItem: HistoryItem = { date: new Date().toISOString(), data: item.data };
      setHistory((previousHistory: any) => {
        return [historyItem, ...previousHistory.filter((value: HistoryItem) => value.data !== historyItem.data)].slice(
          0,
          MAX_HISTORY_ITEMS
        );
      });
    },
    clear: () => setHistory([]),
  };
}

export function addToHistoryHeight(item: SizeTheme) {
  const cache = new Cache();

  const serialezedHistory = cache.get("history");
  const previousHistory = serialezedHistory ? (JSON.parse(serialezedHistory) as HistoryItem[]) : [];

  const historyItem: HistoryItem = { date: new Date().toISOString(), data: item };
  const newHistory = [historyItem, ...previousHistory.filter((item: any) => item.item !== historyItem.data)];

  cache.set("history", JSON.stringify(newHistory.slice(0, MAX_HISTORY_ITEMS)));
}

import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Color, HistoryItem } from "./types";
import { getFormattedColor } from "./utils";

const MAX_HISTORY_LENGTH = 200;

export function useHistory() {
  const [history, setHistory] = useCachedState<HistoryItem[]>("history", []);
  return {
    history,
    remove: (color: Color) =>
      setHistory((previousHistory) => {
        return previousHistory.filter((item) => getFormattedColor(item.color) !== getFormattedColor(color));
      }),
    add: (color: Color) => {
      const historyItem: HistoryItem = { date: new Date().toISOString(), color };
      setHistory((previousHistory) => {
        return [
          historyItem,
          ...previousHistory.filter((item) => getFormattedColor(item.color) !== getFormattedColor(color)),
        ].slice(0, MAX_HISTORY_LENGTH);
      });
    },
    clear: () => setHistory([]),
  };
}

export function addToHistory(color: Color) {
  const cache = new Cache();

  const serializedHistory = cache.get("history");
  const previousHistory = serializedHistory ? (JSON.parse(serializedHistory) as HistoryItem[]) : [];

  const historyItem: HistoryItem = { date: new Date().toISOString(), color };
  const newHistory = [
    historyItem,
    ...previousHistory.filter((item) => getFormattedColor(item.color) !== getFormattedColor(color)),
  ].slice(0, MAX_HISTORY_LENGTH);

  cache.set("history", JSON.stringify(newHistory));
}

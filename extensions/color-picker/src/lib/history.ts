import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { HistoryColor, HistoryItem } from "./types";
import { getFormattedColor } from "./utils";

const MAX_HISTORY_LENGTH = 200;

export function useHistory() {
  const [history, setHistory] = useCachedState<HistoryItem[]>("history", []);
  const update = (color: HistoryColor, updateItem: (item: HistoryItem) => HistoryItem) =>
    setHistory((previousHistory) => {
      return previousHistory.map((item) =>
        getFormattedColor(item.color) === getFormattedColor(color) ? updateItem(item) : item,
      );
    });

  return {
    history,
    remove: (color: HistoryColor) =>
      setHistory((previousHistory) => {
        return previousHistory.filter((item) => getFormattedColor(item.color) !== getFormattedColor(color));
      }),
    edit: (historyItem: HistoryItem) =>
      setHistory((previousHistory) => {
        return previousHistory.map((item) =>
          getFormattedColor(item.color) === getFormattedColor(historyItem.color) ? historyItem : item,
        );
      }),
    addToFavorites: (color: HistoryColor) => update(color, (item) => ({ ...item, isFavorite: true })),
    removeFromFavorites: (color: HistoryColor) => update(color, (item) => ({ ...item, isFavorite: false })),
    moveFavorite: (color: HistoryColor, direction: "up" | "down") =>
      setHistory((previousHistory) => {
        const colorKey = getFormattedColor(color);
        const currentIndex = previousHistory.findIndex(
          (item) => item.isFavorite && getFormattedColor(item.color) === colorKey,
        );

        if (currentIndex === -1) {
          return previousHistory;
        }

        const favoriteIndexes = previousHistory.reduce<number[]>((indexes, item, index) => {
          if (item.isFavorite) {
            indexes.push(index);
          }

          return indexes;
        }, []);
        const favoriteIndex = favoriteIndexes.indexOf(currentIndex);
        const targetFavoriteIndex = favoriteIndex + (direction === "up" ? -1 : 1);
        const targetIndex = favoriteIndexes[targetFavoriteIndex];

        if (targetIndex === undefined) {
          return previousHistory;
        }

        const nextHistory = [...previousHistory];
        [nextHistory[currentIndex], nextHistory[targetIndex]] = [nextHistory[targetIndex], nextHistory[currentIndex]];
        return nextHistory;
      }),
    clear: () => setHistory([]),
  };
}

export function addToHistory(color: HistoryColor) {
  const cache = new Cache();

  const serializedHistory = cache.get("history");
  const previousHistory = serializedHistory ? (JSON.parse(serializedHistory) as HistoryItem[]) : [];
  const colorKey = getFormattedColor(color);
  const previousHistoryItem = previousHistory.find((item) => getFormattedColor(item.color) === colorKey);

  const historyItem: HistoryItem = {
    date: new Date().toISOString(),
    color,
    title: previousHistoryItem?.title,
    isFavorite: previousHistoryItem?.isFavorite,
  };
  const history = previousHistoryItem?.isFavorite
    ? previousHistory.map((item) => (getFormattedColor(item.color) === colorKey ? historyItem : item))
    : [historyItem, ...previousHistory.filter((item) => getFormattedColor(item.color) !== colorKey)];
  const persistentItemsCount = history.filter((item) => item.isFavorite).length;
  const maxRegularHistoryLength = Math.max(MAX_HISTORY_LENGTH - persistentItemsCount, 0);
  let regularHistoryCount = 0;
  const newHistory = history.filter((item) => {
    if (item.isFavorite) {
      return true;
    }

    regularHistoryCount += 1;
    return regularHistoryCount <= maxRegularHistoryLength;
  });

  cache.set("history", JSON.stringify(newHistory));
}

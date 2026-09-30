import formatDate from "./formatDate.js";

import type { HistoryItem } from "../hooks/useHistory.js";

export interface HistoryGroup {
  title: string;
  items: HistoryItem[];
}

export default function groupHistory(history: HistoryItem[]) {
  const historyGroups = [] as HistoryGroup[];

  history.forEach((historyItem) => {
    const title = formatDate(historyItem.date);
    const group = historyGroups.find((group) => group.title === title);

    if (group == null) {
      historyGroups.push({ title, items: [historyItem] });
    } else {
      group.items.push(historyItem);
    }
  });

  return historyGroups;
}

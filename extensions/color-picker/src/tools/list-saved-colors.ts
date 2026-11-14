import { Cache } from "@raycast/api";
import { isInGroup, normalizeGroup } from "../lib/groups";
import { HistoryItem } from "../lib/types";
import { getFormattedColor } from "../lib/utils";

type Input = {
  /** Choose whether to return all saved colors or only favorites. */
  filter?: "all" | "favorites";
  /** Only return colors in this group or its subgroups. Nested groups are written with slashes, for example "Work/Calendar". */
  group?: string;
  /** Maximum number of colors to return. Defaults to 20 and must be between 1 and 100. */
  limit?: number;
};

/** List colors saved in Color Picker, newest first. */
export default function listSavedColors(input: Input) {
  const cache = new Cache();
  const serializedHistory = cache.get("history");
  const history = serializedHistory ? (JSON.parse(serializedHistory) as HistoryItem[]) : [];
  const filter = input.filter ?? "all";
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 20), 1), 100);
  const filteredColors = filter === "favorites" ? history.filter((item) => item.isFavorite) : history;
  const group = normalizeGroup(input.group ?? "");
  const matchingColors = group ? filteredColors.filter((item) => isInGroup(item.group, group)) : filteredColors;

  return {
    filter,
    totalCount: matchingColors.length,
    colors: matchingColors.slice(0, limit).map((item) => ({
      color: getFormattedColor(item.color, "hex"),
      title: item.title,
      isFavorite: Boolean(item.isFavorite),
      group: item.group,
      savedAt: item.date,
    })),
  };
}

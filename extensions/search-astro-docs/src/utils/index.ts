import { DocumentationEntry, Preferences } from "../types/types";
import { getPreferenceValues } from "@raycast/api";

export const toSearchable = (search: string) => {
  return search.replaceAll(/ /g, "").toLowerCase();
};

export const searchIncludes = (item: DocumentationEntry, search: string) => {
  return (
    toSearchable(item.title).includes(toSearchable(search)) ||
    item.keywords?.filter((keyword) => toSearchable(keyword).includes(toSearchable(search)))?.length
  );
};

export const preferences = getPreferenceValues<Preferences>();

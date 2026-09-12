import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";

import type { EpicData, Preferences } from "../types";

export const useEpicFilter = (epics: EpicData[] | undefined, workingOnEpicName: string | undefined, query: string) => {
  const preferences = getPreferenceValues<Preferences>();

  const filteredEpics = useMemo(() => {
    const [name_, ...description_] = query.split("/");
    const name = name_.trim().toLocaleLowerCase();
    const description = description_.join("/").trim().toLocaleLowerCase();
    return epics?.filter(
      (epic) =>
        epic.name.toLocaleLowerCase().includes(name) ||
        epic.description?.toLocaleLowerCase().includes(name) ||
        (description && epic.description?.toLocaleLowerCase().includes(description)),
    );
  }, [epics, query]);

  const sortByAddedTime = (epics: EpicData[]) => {
    return epics.sort((a, b) => {
      if (!a.addedTimestamp || !b.addedTimestamp) return 0;
      return a.addedTimestamp - b.addedTimestamp;
    });
  };

  const sortByLastUsedTimeDesc = (epics: EpicData[]) => {
    return epics.sort((a, b) => {
      if (!a.lastUsedTimestamp || !b.lastUsedTimestamp) return 0;
      return b.lastUsedTimestamp - a.lastUsedTimestamp;
    });
  };

  const sortByName = (epics: EpicData[], order: "asc" | "desc") => {
    return epics.sort((a, b) => {
      if (!a.name || !b.name) return 0;
      if (order === "asc") return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });
  };

  const sortedEpics = useMemo(() => {
    if (!filteredEpics) return undefined;
    switch (preferences.epicSortMethod) {
      case "addedTime":
        return sortByAddedTime(filteredEpics);
      case "lastUsedTime":
        return sortByLastUsedTimeDesc(filteredEpics);
      case "nameAsc":
        return sortByName(filteredEpics, "asc");
      case "nameDesc":
        return sortByName(filteredEpics, "desc");
      default:
        return filteredEpics;
    }
  }, [filteredEpics, preferences.epicSortMethod]);

  const bringActiveEpicToTheTop = useMemo(() => {
    if (!filteredEpics) return undefined;
    if (!preferences.bringActiveEpicToTop) return filteredEpics;
    if (!workingOnEpicName) return filteredEpics;
    const workingEpicIndex = filteredEpics.findIndex((epic) => epic.name === workingOnEpicName);
    if (workingEpicIndex === -1) return filteredEpics;
    const workingEpic = filteredEpics[workingEpicIndex];
    const filteredEpicsWithoutWorkingEpic = filteredEpics.filter((epic) => epic !== workingEpic);
    return [workingEpic, ...filteredEpicsWithoutWorkingEpic];
  }, [sortedEpics, workingOnEpicName, preferences.bringActiveEpicToTop]);

  return bringActiveEpicToTheTop;
};

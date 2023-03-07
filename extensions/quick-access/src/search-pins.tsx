import { getPreferenceValues, LocalStorage } from "@raycast/api";
import React from "react";
import { getLocalStorage, isEmpty } from "./utils/common-utils";
import { DirectoryInfo, Layout } from "./types/types";
import { LocalStorageKey } from "./utils/constants";
import { refreshNumber } from "./hooks/hooks";
import { SearchPinsList } from "./components/search-pins-list";
import { Preferences } from "./types/preferences";
import { SearchPinsGrid } from "./components/search-pins-grid";

export default function SearchPins() {
  const { layout } = getPreferenceValues<Preferences>();
  return layout === Layout.LIST ? <SearchPinsList /> : <SearchPinsGrid />;
}

export async function upRank(index: number, setRefresh: React.Dispatch<React.SetStateAction<number>>) {
  const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
  const directories: DirectoryInfo[] = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);
  const moreHighRank = directories.filter((value) => {
    return value.path !== directories[index].path && value.rank >= directories[index].rank;
  });
  if (moreHighRank.length !== 0) {
    let allRank = 0;
    directories.forEach((value) => [(allRank = allRank + value.rank)]);
    directories[index].rank = Math.floor((directories[index].rank + 1 - directories[index].rank / allRank) * 100) / 100;
  }
  directories.sort(function (a, b) {
    return b.rank - a.rank;
  });

  await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(directories));
  setRefresh(refreshNumber());
}

import { ItemInput } from "./input-utils";
import { urlBuilder } from "./common-utils";
import { getPreferenceValues, Icon, LocalStorage, open, popToRoot, showHUD } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { SEARCH_ENGINE } from "./constants";
import { ItemType, OpenLinkApplication } from "../types/types";
import React from "react";

//list item
export const searchBarPlaceholder = (inputText: ItemInput) => {
  switch (inputText.type) {
    case ItemType.TEXT:
      return "Search " + inputText.type.toLowerCase() + " in";
    case ItemType.URL:
      return "Open " + inputText.type.toLowerCase() + " in";
    case ItemType.EMAIL:
      return "Email " + inputText.type.toLowerCase() + " in";
    case ItemType.NULL:
      return "Detect link by pressing ⏎";
  }
};
//list item
export const actionTitle = (inputText: ItemInput, applicationName: string) => {
  switch (inputText.type) {
    case ItemType.TEXT:
      return "Search in " + applicationName;
    case ItemType.URL:
      return "Open in " + applicationName;
    case ItemType.EMAIL:
      return "Email in " + applicationName;
    case ItemType.NULL:
      return "Detect Link";
  }
};

export const actionIcon = (inputText: ItemInput) => {
  switch (inputText.type) {
    case ItemType.TEXT:
      return Icon.MagnifyingGlass;
    case ItemType.URL:
      return Icon.Link;
    case ItemType.EMAIL:
      return Icon.Envelope;
    case ItemType.NULL:
      return Icon.TwoArrowsClockwise;
  }
};

export async function actionOnApplicationItem(
  inputText: ItemInput,
  app: OpenLinkApplication,
  setRefresh: React.Dispatch<React.SetStateAction<number>>
) {
  if (inputText.type != ItemType.NULL) {
    switch (inputText.type) {
      case ItemType.URL:
        await showHUD("Open link in " + app.name);
        break;
      case ItemType.TEXT:
        await showHUD("Search text by " + getPreferenceValues<Preferences>().surfEngine + " in " + app.name);
        break;
      case ItemType.EMAIL:
        await showHUD("Send e-mail in " + app.name);
        break;
    }
    await openSurfboard(searchEngineURLBuilder(inputText), app.path);
    await popToRoot({ clearSearchBar: true });
  } else {
    setRefresh(Date.now());
  }
}

export async function openSurfboard(url: string, path: string) {
  try {
    await open(url, path);
  } catch (e) {
    await showHUD("Error Input!");
  }
}

export function searchEngineURLBuilder(itemInput: ItemInput): string {
  switch (itemInput.type) {
    case ItemType.EMAIL: {
      return itemInput.content;
    }
    case ItemType.URL: {
      return itemInput.content;
    }
    default: {
      switch (getPreferenceValues<Preferences>().surfEngine) {
        case "Google": {
          return urlBuilder(SEARCH_ENGINE.google, itemInput.content);
        }
        case "Bing": {
          return urlBuilder(SEARCH_ENGINE.bing, itemInput.content);
        }
        case "Baidu": {
          return urlBuilder(SEARCH_ENGINE.baidu, itemInput.content);
        }
        case "Brave": {
          return urlBuilder(SEARCH_ENGINE.brave, itemInput.content);
        }
        case "DuckDuckGo": {
          return urlBuilder(SEARCH_ENGINE.duckduckgo, itemInput.content);
        }
      }
      return urlBuilder(SEARCH_ENGINE.google, itemInput.content);
    }
  }
}

/**
 *
 * Rank increase: Percentage rank
 * The larger the rank, the smaller the increase
 * The smaller the rank, the larger the increase
 *
 */
export async function upBrowserRank(
  itemInput: ItemInput,
  browser: OpenLinkApplication,
  browsers: OpenLinkApplication[]
) {
  browsers.map((val, index) => {
    if (val.name == browser.name) {
      switch (itemInput.type) {
        case ItemType.TEXT: {
          //Prevent excessive rank growth
          const moreHighRank = browsers.filter((value) => {
            return value.path !== browser.path && value.rankText >= browser.rankText;
          });
          if (moreHighRank.length == 0) {
            break;
          }
          let allTextRank = 0;
          browsers.forEach((value) => [(allTextRank = allTextRank + value.rankText)]);
          browsers[index].rankText =
            Math.floor((browsers[index].rankText + 1 - browsers[index].rankText / allTextRank) * 100) / 100;
          break;
        }
        case ItemType.EMAIL: {
          //Prevent excessive rank growth
          const moreHighRank = browsers.filter((value) => {
            return value.path !== browser.path && value.rankEmail >= browser.rankEmail;
          });
          if (moreHighRank.length == 0) {
            break;
          }
          let allEmailRank = 0;
          browsers.forEach((value) => [(allEmailRank = allEmailRank + value.rankEmail)]);
          browsers[index].rankEmail =
            Math.floor((browsers[index].rankEmail + 1 - browsers[index].rankEmail / allEmailRank) * 100) / 100;
          break;
        }
        case ItemType.URL: {
          //Prevent excessive rank growth
          const moreHighRank = browsers.filter((value) => {
            return value.path !== browser.path && value.rankURL >= browser.rankURL;
          });
          if (moreHighRank.length == 0) {
            break;
          }
          let allURLRank = 0;
          browsers.forEach((value) => [(allURLRank = allURLRank + value.rankURL)]);
          browsers[index].rankURL =
            Math.floor((browsers[index].rankURL + 1 - browsers[index].rankURL / allURLRank) * 100) / 100;
          break;
        }
      }
    }
  });
  boardsSort(browsers, itemInput);
  await LocalStorage.setItem("boards", JSON.stringify(browsers));
}

export async function clearRank(surfApplication: OpenLinkApplication, surfApplications: OpenLinkApplication[]) {
  surfApplications.map((value) => {
    if (value.path == surfApplication.path) value.rankText = 1;
    value.rankURL = 1;
    value.rankEmail = 1;
  });
  surfApplications.sort(function (a, b) {
    return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
  });
  await LocalStorage.setItem("boards", JSON.stringify(surfApplications));
  return [...surfApplications];
}

export async function clearAllRank(surfApplications: OpenLinkApplication[]) {
  surfApplications.forEach((value) => {
    value.rankText = 1;
    value.rankURL = 1;
    value.rankEmail = 1;
  });
  surfApplications.sort(function (a, b) {
    return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
  });
  await LocalStorage.setItem("boards", JSON.stringify(surfApplications));
  return [...surfApplications];
}

export function boardsSort(browsers: OpenLinkApplication[], inputItem: ItemInput) {
  switch (getPreferenceValues<Preferences>().sortBy) {
    case "Rank": {
      return browsers.sort(function (a, b) {
        return sortByItemType(inputItem, a, b);
      });
    }
    case "Name+": {
      return browsers.sort(function (a, b) {
        return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
      });
    }
    case "Name-": {
      return browsers.sort(function (a, b) {
        return b.name.toUpperCase() > a.name.toUpperCase() ? 1 : -1;
      });
    }
    default: {
      return browsers;
    }
  }
}

export function sortByItemType(inputItem: ItemInput, a: OpenLinkApplication, b: OpenLinkApplication) {
  switch (inputItem.type) {
    case ItemType.EMAIL: {
      return b.rankEmail - a.rankEmail;
    }
    case ItemType.URL: {
      return (b.rankURL - a.rankURL) * 0.75 + (b.rankText - a.rankText) * 0.25;
    }
    case ItemType.TEXT: {
      return (b.rankText - a.rankText) * 0.75 + (b.rankURL - a.rankURL) * 0.25;
    }
    case ItemType.NULL: {
      return 0;
    }
  }
}

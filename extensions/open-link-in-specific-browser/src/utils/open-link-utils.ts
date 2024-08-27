import { ItemInput } from "./input-utils";
import { urlBuilder } from "./common-utils";
import { Application, Icon, open, showHUD } from "@raycast/api";
import { SEARCH_ENGINE } from "./constants";
import { ItemType } from "../types/types";
import { surfEngine } from "../types/preferences";

export const actionTitle = (inputText: ItemInput, applicationName: string) => {
  switch (inputText.type) {
    case ItemType.TEXT:
      return "Search in " + applicationName;
    case ItemType.URL:
      return "Open in " + applicationName;
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
    case ItemType.NULL:
      return Icon.Repeat;
  }
};

export const tooltipsContent = (inputText: ItemInput, onlyDomain: boolean = false) => {
  switch (inputText.type) {
    case ItemType.TEXT:
      return "🔍 " + inputText.content;
    case ItemType.URL:
      return "🔗 " + (onlyDomain ? getHostname(inputText.content) : inputText.content);
    case ItemType.NULL:
      return "✨ Detecting...";
  }
};

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
};

export async function actionOnApplicationItem(inputText: ItemInput, app: Application) {
  if (inputText.type != ItemType.NULL) {
    switch (inputText.type) {
      case ItemType.URL:
        await showHUD("Open link in " + app.name);
        break;
      case ItemType.TEXT:
        await showHUD("Search text by " + surfEngine + " in " + app.name);
        break;
    }
    await openLinkinBrowser(searchEngineURLBuilder(inputText), app.path);
  }
}

export async function openLinkinBrowser(url: string, path: string) {
  try {
    if (path === "/Applications/MenubarX.app") {
      await open(`menubarx://open/?xurl=${url}&xwidth=375&xheight=667&xbar=1`);
    } else {
      await open(url, path);
    }
  } catch (e) {
    await showHUD("Error Input!");
  }
}

export function searchEngineURLBuilder(itemInput: ItemInput): string {
  switch (itemInput.type) {
    case ItemType.URL: {
      return itemInput.content;
    }
    default: {
      switch (surfEngine) {
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

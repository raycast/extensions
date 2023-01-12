import { Icon, Image, environment } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { SideBarSpace, SideBarFolder, SideBarTab, SideBarItem, SearchResult } from "../types/types";
import { ArcIcon, ArcItem, ArcSpace, ArcTab } from "../types/arc";
import { match, getHexColor } from "./utils";
import { ArcIcons } from "./icon";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export const sideBarPath = join(homedir(), "Library", "Application Support", "Arc", "StorableSidebar.json");

const getColor = (space: ArcSpace): string => {
  const colorObject = space.customInfo.windowTheme.background.single._0.style.color._0;
  if ("blendedSingleColor" in colorObject) {
    return getHexColor(colorObject.blendedSingleColor._0.color);
  } else if ("blendedGradient" in colorObject) {
    return getHexColor(colorObject.blendedGradient._0.baseColors[0]);
  } else {
    return environment.theme === "light" ? "#000000" : "#ffffff";
  }
};

const getIcon = (icon: ArcIcon | undefined): Image.ImageLike | undefined => {
  if (icon && icon.emoji && icon.emoji_v2) {
    return { source: icon.emoji_v2 };
  }
  return undefined;
};

const getSpaceIcon = (space: ArcSpace, color: string): Image.ImageLike => {
  const icon = getIcon(space.customInfo.iconType);
  if (icon) return icon;
  return { ...ArcIcons.Space, tintColor: color };
};

const getTabIcon = (tab: ArcTab): Image.ImageLike => {
  const icon = getIcon(tab.customInfo?.iconType);
  if (icon) return icon;
  const favicon: Image = getFavicon(tab.savedURL, { fallback: Icon.Link }) as Image;
  favicon.mask = Image.Mask.RoundedRectangle;
  return favicon;
};

const mapItemToTab = (id: string, itemMap: { [key: string]: ArcItem }, color: string): SideBarItem => {
  const item = itemMap[id];
  if ("list" in item.data && item.title) {
    return {
      id: item.id,
      title: item.title,
      children: item.childrenIds.map((id) => mapItemToTab(id, itemMap, color)),
      color: color,
    };
  } else if ("tab" in item.data) {
    return {
      id: item.id,
      title: item.title ? item.title : item.data.tab.savedTitle,
      url: item.data.tab.savedURL,
      icon: getTabIcon(item.data.tab),
    };
  } else if ("easel" in item.data) {
    return {
      type: "easel",
      id: item.data.easel.easelID,
      title: item.data.easel.title,
    };
  } else if ("arcDocument" in item.data && item.title) {
    return {
      type: "document",
      id: item.data.arcDocument.arcDocumentID,
      title: item.title,
    };
  } else if ("splitView" in item.data) {
    return {
      id: item.id,
      tabs: item.childrenIds.map((id) => mapItemToTab(id, itemMap, color)) as SideBarTab[],
      color: color,
    };
  }
  return {} as SideBarItem;
};

export const getTopTabs = async (): Promise<SideBarTab[]> => {
  const response = JSON.parse(await readFile(sideBarPath, "utf-8"));
  const items = response["sidebar"]["containers"][1]["items"];
  const itemMap: { [key: string]: ArcItem } = {};
  for (let i = 0; i < items.length; i += 2) {
    itemMap[items[i]] = items[i + 1];
  }
  const topApps = [];
  for (const id of itemMap[response["sidebar"]["containers"][1]["topAppsContainerIDs"][1]].childrenIds) {
    const item = itemMap[id];
    if ("tab" in item.data) {
      topApps.push({
        id: item.id,
        title: item.title ? item.title : item.data.tab.savedTitle,
        url: item.data.tab.savedURL,
        icon: getTabIcon(item.data.tab),
      });
    }
  }
  return topApps;
};

export const getSpaces = async (): Promise<SideBarSpace[]> => {
  const response = JSON.parse(await readFile(sideBarPath, "utf-8"));
  const items = response["sidebar"]["containers"][1]["items"];
  const itemMap: { [key: string]: ArcItem } = {};
  for (let i = 0; i < items.length; i += 2) {
    itemMap[items[i]] = items[i + 1];
  }
  const spaces = response["sidebar"]["containers"][1]["spaces"].filter(
    (_: string | ArcSpace, i: number) => i % 2 === 1
  );
  return spaces.map((space: ArcSpace) => {
    const containerItems = space.containerIDs;
    const a = containerItems.findIndex((i) => i === "pinned");
    const b = containerItems.findIndex((i) => i === "unpinned");
    let pinnedItems, unpinnedItems;
    if (a < b) {
      pinnedItems = containerItems.slice(a + 1, b);
      unpinnedItems = containerItems.slice(b + 1);
    } else {
      unpinnedItems = containerItems.slice(b + 1, a);
      pinnedItems = containerItems.slice(a + 1);
    }
    const color = getColor(space);
    const pinned: SideBarItem[] = pinnedItems
      .map((id) => itemMap[id].childrenIds.map((id) => mapItemToTab(id, itemMap, color)))
      .flat();
    const unpinned: SideBarItem[] = unpinnedItems
      .map((id) => itemMap[id].childrenIds.map((id) => mapItemToTab(id, itemMap, color)))
      .flat();
    return {
      id: space.id,
      title: space.title,
      icon: getSpaceIcon(space, color),
      color,
      pinned,
      unpinned,
    };
  });
};

const addResult = (text: string, item: SideBarItem, results: SideBarItem[]) => {
  if ("children" in item) {
    if (match(item.title, text)) {
      results.push(item);
    }
    for (const child of item.children) {
      addResult(text, child, results);
    }
  } else if ("tabs" in item) {
    for (const tab of item.tabs) {
      if (match(tab.title, text) || match(tab.url, text)) {
        results.push(item);
        break;
      }
    }
  } else {
    if (match(item.title, text) || ("url" in item && match(item.url, text))) {
      results.push(item);
    }
  }
};

export const searchFolder = (folder: SideBarFolder, text: string): SearchResult[] | undefined => {
  if (text) {
    const results: SearchResult[] = [{ parent: folder, children: [] }];
    for (const child of folder.children) {
      if ("children" in child) {
        if (match(child.title, text)) {
          results[0].children.push(child);
        }
        const childResults = searchFolder(child, text);
        if (childResults) {
          results.push(...childResults);
        }
      } else {
        addResult(text, child, results[0].children);
      }
    }
    return results;
  }
  return undefined;
};

export const searchSpace = (space: SideBarSpace, text: string): SearchResult[] | undefined => {
  if (text) {
    const results: SearchResult[] = [{ parent: space, children: [] }];
    for (const child of space.pinned) {
      if ("children" in child) {
        if (match(child.title, text)) {
          results[0].children.push(child);
        }
        const childResults = searchFolder(child, text);
        if (childResults) {
          results.push(...childResults);
        }
      } else {
        addResult(text, child, results[0].children);
      }
    }
    for (const child of space.unpinned) {
      addResult(text, child, results[0].children);
    }
    return results;
  }
  return undefined;
};

export const searchSpaces = (spaces: SideBarSpace[], text: string): SearchResult[] | undefined => {
  if (text) {
    const results: SearchResult[] = [];
    for (const space of spaces) {
      const spaceResults: SideBarItem[] = [];
      for (const child of space.pinned) {
        addResult(text, child, spaceResults);
      }
      for (const child of space.unpinned) {
        addResult(text, child, spaceResults);
      }
      if (spaceResults.length > 0) {
        results.push({ parent: space, children: spaceResults });
      }
    }
    return results;
  }
  return undefined;
};

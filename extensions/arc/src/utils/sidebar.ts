import { Color, environment, Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { SideBarSpace, SideBarFolder, SideBarTab, SideBarItem, SearchResult } from "./types";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { match, getHexColor } from "./utils";

export const sideBarPath = join(homedir(), "Library", "Application Support", "Arc", "StorableSidebar.json");

const getColor = (space: any): string => {
  const colorObject = space["customInfo"]["windowTheme"]["background"]["single"]["_0"]["style"]["color"]["_0"];
  let color;
  if ("blendedSingleColor" in colorObject) {
    color = colorObject["blendedSingleColor"]["_0"]["color"];
  } else if ("blendedGradient" in colorObject) {
    color = colorObject["blendedGradient"]["_0"]["baseColors"][0];
  } else {
    return environment.theme === "light" ? "#000000" : "#ffffff";
  }
  return getHexColor(color["red"], color["green"], color["blue"]);
};

const getIcon = (info: any): Image.ImageLike | undefined => {
  if ("customInfo" in info && "iconType" in info["customInfo"] && "emoji_v2" in info["customInfo"]["iconType"]) {
    return { source: info["customInfo"]["iconType"]["emoji_v2"] };
  }
  return undefined;
};

const getSpaceIcon = (space: any, color: string): Image.ImageLike => {
  const icon = getIcon(space);
  if (icon) return icon;
  return { source: Icon.AppWindowGrid3x3, tintColor: color };
};

const getTabIcon = (tab: any): Image.ImageLike => {
  const icon = getIcon(tab);
  if (icon) return icon;
  const favicon: Image = getFavicon(tab["savedURL"], { fallback: Icon.Link }) as Image;
  favicon.mask = Image.Mask.RoundedRectangle; 
  return favicon;
};

const mapItemToTab = (id: string, itemMap: { [key: string]: any }, color: string): SideBarItem => {
  const item = itemMap[id];
  if ("list" in item["data"]) {
    return {
      id: item["id"],
      title: item["title"],
      children: item["childrenIds"].map((id: string) => mapItemToTab(id, itemMap, color)),
      color: color,
    };
  } else if ("easel" in item["data"]) {
    return {
      type: "easel",
      id: item["data"]["easel"]["easelID"],
      title:item["data"]["easel"]["title"],
      color: color
    };
  } else if ("arcDocument" in item["data"]) {
    return {
      type: "notes",
      id: item["data"]["arcDocument"]["arcDocumentID"],
      title: item["title"],
      color: color
    };
  } else if ("splitView" in item["data"]) {
    return {
      id: item["id"],
      tabs: item["childrenIds"].map((id: string) => mapItemToTab(id, itemMap, color)),
      color: color
    };
  } else {
    const tab = item["data"]["tab"];
    return {
      id: item["id"],
      title: item["title"] ? item["title"] : tab["savedTitle"],
      url: tab["savedURL"],
      icon: getTabIcon(tab),
    };
  }
};

export const getTopTabs = async (): Promise<SideBarTab[]> => {
  try {
    const json = await readFile(sideBarPath, "utf-8");
    const response = JSON.parse(json);
    const items = response["sidebar"]["containers"][1]["items"];
    const itemMap: { [key: string]: any } = {};
    for (const item of items.filter((_: any, i: number) => i % 2 === 1)) {
      itemMap[item["id"]] = item;
    }
    const topAppIds: string[] = itemMap[response["sidebar"]["containers"][1]["topAppsContainerIDs"][1]]["childrenIds"];
    return topAppIds.map((id: string) => {
      const item = itemMap[id];
      const tab = item["data"]["tab"];
      return {
        id: item["id"],
        title: item["title"] ? item["title"] : tab["savedTitle"],
        url: tab["savedURL"],
        icon: getTabIcon(tab),
      };
    });
  } catch {
    console.error("Unable to get Top Apps");
    return [];
  }
};

export const getSpaces = async (): Promise<SideBarSpace[]> => {
  try {
    const json = await readFile(sideBarPath, "utf-8");
    const response = JSON.parse(json);
    const items = response["sidebar"]["containers"][1]["items"];
    const itemMap: { [key: string]: any } = {};
    for (const item of items.filter((_: any, i: number) => i % 2 === 1)) {
      itemMap[item["id"]] = item;
    }
    const spaces = response["sidebar"]["containers"][1]["spaces"].filter((_: any, i: number) => i % 2 === 1);
    return spaces.map((space: any) => {
      const containerItems = space["containerIDs"];
      const pinnedIndex = containerItems.findIndex((item: any) => item === "pinned");
      const unpinnedIndex = containerItems.findIndex((item: any) => item === "unpinned");
      let pinnedItems, unpinnedItems;
      if (pinnedIndex < unpinnedIndex) {
        pinnedItems = containerItems.slice(pinnedIndex + 1, unpinnedIndex);
        unpinnedItems = containerItems.slice(unpinnedIndex + 1);
      } else {
        unpinnedItems = containerItems.slice(unpinnedIndex + 1, pinnedIndex);
        pinnedItems = containerItems.slice(pinnedIndex + 1);
      }
      const color = getColor(space);
      const pinned: SideBarItem[] = pinnedItems
        .map((id: string) => itemMap[id]["childrenIds"].map((id: string) => mapItemToTab(id, itemMap, color)))
        .flat();
      const unpinned: SideBarItem[] = unpinnedItems
        .map((id: string) => itemMap[id]["childrenIds"].map((id: string) => mapItemToTab(id, itemMap, color)))
        .flat();
      return {
        id: space["id"],
        title: space["title"],
        icon: getSpaceIcon(space, color),
        color,
        pinned,
        unpinned,
      } as SideBarSpace;
    });
  } catch {
    console.error("Unable to get Spaces");
    return [];
  }
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

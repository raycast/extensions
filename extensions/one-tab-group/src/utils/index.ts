import type { MapFunc, AnyRecord, Tab, Tabs } from "../types";

const TAB_GROUP_ID_NONE = -1;

export const isString = <T = any>(str: string | T): str is string => {
  return typeof str === "string";
};

export const groupBy = <T = any>(arr: T[], fn: MapFunc<T> | string) =>
  arr.map(isString(fn) ? (val: any) => val[fn] : fn).reduce((acc, val, i) => {
    acc[val] = (acc[val] || []).concat(arr[i]);
    return acc;
  }, {});

export const omit = (obj: AnyRecord, arr: string[]) =>
  Object.keys(obj)
    .filter((k: string) => !arr.includes(k))
    .reduce((acc, key) => ((acc[key] = obj[key]), acc), {} as AnyRecord);

/**
 * Make a TabTree for render TabDown UI
 * @param tabs
 * @param tabGroups
 * @return tabTree
 */
export const makeTabTree = (tabs: Tabs, tabGroups: Tabs) => {
  const groupByedTabs = groupBy(tabs, "groupId");
  const mapedTabGroups = tabGroups.map((group) => {
    return {
      ...group,
      children: groupByedTabs[group.id],
    };
  });

  const newTabs: Tabs = [];
  const hash = new Map();

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    // if tab is not in group, add to newTabs
    if (tab.groupId === TAB_GROUP_ID_NONE) {
      newTabs.push(tab);
    } else {
      if (hash.has(tab.groupId)) continue;

      hash.set(tab.groupId, tab.groupId);
      const groupedIdx = mapedTabGroups.findIndex((item: any) => item.id === tab.groupId);
      if (groupedIdx !== -1) newTabs.push(mapedTabGroups[groupedIdx]);
    }
  }

  hash.clear();
  return newTabs;
};

/**
 * Flatten a TabTree to tabs & tabGroups, dynamic set `groupId` props
 * @param tabTree
 * @returns [tabs, tabGroups]
 */
export const flattenTabs = (tabTree: Tabs) => {
  const tabs: Tabs = [];
  const tabGroups: Tabs = [];

  for (let index = 0; index < tabTree.length; index++) {
    const item = tabTree[index];
    if (!item) continue;

    if (item.children) {
      const groupId = item.id;
      item.children.forEach((tab: Tab) => {
        tabs.push({
          ...tab,
          groupId,
        });
      });
      tabGroups.push(omit(item, ["children"]));
    } else {
      tabs.push({
        ...item,
        groupId: TAB_GROUP_ID_NONE,
      });
    }
  }

  return { tabs, tabGroups };
};

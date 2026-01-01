import { List, Icon, ActionPanel, Action, LaunchProps } from "@raycast/api";
import { useMemo, useState } from "react";
import Fuse from "fuse.js";

import { useBrowserTabs } from "./hooks/useBrowserTabs";
import { ActionTab } from "./components/action-tab";
import { Tab } from "./utils/tabs-helper";

export default function Command(props: LaunchProps) {
  const [query, setQuery] = useState(props.fallbackText || "");
  const [selectedBrowser, setSelectedBrowser] = useState("");

  const { data: tabs, isLoading, mutate } = useBrowserTabs();

  // 获取所有浏览器类型
  const browsers = useMemo(() => {
    if (!tabs) return [];
    const browserSet = new Set(tabs.map((tab) => tab.browser));
    return Array.from(browserSet);
  }, [tabs]);

  // 根据选择的浏览器过滤标签页
  const filteredTabs = useMemo(() => {
    if (!tabs) return [];

    if (selectedBrowser === "") {
      return tabs;
    }

    return tabs.filter((tab) => tab.browser === selectedBrowser);
  }, [tabs, selectedBrowser]);

  // 使用 Fuse.js 进行模糊搜索
  const searchResults = useMemo(() => {
    if (query === "") {
      return filteredTabs;
    }

    const fuse = new Fuse(filteredTabs, {
      keys: [
        { name: "title", weight: 3 },
        { name: "pinyin", weight: 2 }, // 支持拼音首字母搜索
        { name: "browser", weight: 1 },
        { name: "windowTitle", weight: 2 }, // 支持按窗口标题搜索
        { name: "tabGroup", weight: 2 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });

    return fuse.search(query).map((result) => result.item);
  }, [filteredTabs, query]);

  // 按窗口标题分组 (Window Title)
  // 用户要求: "按ALT+Tab 显示的窗口名称" 分组
  const groupedTabs = useMemo(() => {
    const groups: Record<string, Tab[]> = {};

    for (const tab of searchResults) {
      // 优先使用 windowTitle (e.g., "Google - Microsoft Edge", "Workspace A - Microsoft Edge")
      // 如果 windowTitle 为空 (理应不为空), 回退到 browser
      // 我们也可以稍微美化一下，比如把 " - Microsoft Edge" 去掉?
      // 用户说 "我是指按ALT+Tab 显示的窗口名称"，所以最好保持原样，或者仅仅作为分组标题
      const groupKey = tab.windowTitle || tab.browser;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(tab);
    }

    // 对分组键进行排序
    return Object.entries(groups).sort(([keyA], [keyB]) => {
      return keyA.localeCompare(keyB);
    });
  }, [searchResults]);

  const handleRefresh = async () => {
    await mutate();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜索标签页 (支持拼音、窗口名搜索)..."
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarAccessory={
        <List.Dropdown tooltip="选择浏览器" onChange={setSelectedBrowser}>
          <List.Dropdown.Item icon={Icon.Globe} title="全部浏览器" value="" />
          {browsers.map((browser) => (
            <List.Dropdown.Item
              key={browser}
              icon={Icon.Globe}
              title={browser}
              value={browser}
            />
          ))}
        </List.Dropdown>
      }
    >
      {searchResults.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="没有找到标签页"
          description={
            tabs && tabs.length === 0
              ? "请确保浏览器已打开并有标签页"
              : "尝试其他搜索关键词"
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.RotateClockwise}
                title="刷新"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={handleRefresh}
              />
            </ActionPanel>
          }
        />
      ) : (
        groupedTabs.map(([groupKey, browserTabs]) => (
          <List.Section
            key={groupKey}
            title={groupKey}
            subtitle={`${browserTabs.length} 个标签页`}
          >
            {browserTabs.map((tab) => (
              <List.Item
                key={`${tab.browser}-${tab.index}`}
                title={tab.title}
                subtitle={
                  tab.tabGroup
                    ? `[${tab.tabGroup}]`
                    : tab.isMinimized
                      ? "(最小化)"
                      : undefined
                }
                accessories={[
                  {
                    icon: Icon.Link,
                    tooltip: tab.tabGroup
                      ? `分组: ${tab.tabGroup}`
                      : tab.windowTitle || undefined,
                  },
                ]}
                // 添加关键字
                keywords={[
                  ...(tab.tabGroup ? [tab.tabGroup] : []),
                  tab.windowTitle || "",
                ]}
                icon={tab.browserIcon}
                actions={<ActionTab tab={tab} onTabClosed={handleRefresh} />}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

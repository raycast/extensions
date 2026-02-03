import { Action, ActionPanel, Icon, List, showToast, Toast, open } from "@raycast/api";
import { useState } from "react";

// 定义搜索引擎的数据结构
interface SearchEngine {
  name: string;
  icon: string; // 使用 Raycast 内置 Icon 或 URL
  searchUrl: string; // 搜索链接模板
  homeUrl: string; // 主页链接
}

// 搜索引擎配置列表
const ENGINES: SearchEngine[] = [
  {
    name: "Google",
    icon: "google-logo.svg", // 如果没有本地图片，可以使用 Icon.Globe 或在线图片
    searchUrl: "https://www.google.com/search?q=",
    homeUrl: "https://www.google.com",
  },
  {
    name: "Bing",
    icon: "bing-logo.svg",
    searchUrl: "https://www.bing.com/search?q=",
    homeUrl: "https://www.bing.com",
  },
  {
    name: "Baidu",
    icon: "baidu-logo.svg", // 或者使用 Icon.MagnifyingGlass
    searchUrl: "https://www.baidu.com/s?wd=",
    homeUrl: "https://www.baidu.com",
  },
];

export default function SearchBrowser() {
  const [searchText, setSearchText] = useState<string>("");

  // 辅助函数：根据是否有输入，生成对应的 URL
  const getUrl = (engine: SearchEngine, query: string) => {
    if (!query) return engine.homeUrl;
    return `${engine.searchUrl}${encodeURIComponent(query)}`;
  };

  // 批量打开所有搜索引擎（官方推荐实现）
  const openAllSearchEngines = async (query: string) => {
    if (!query) return; // 无搜索词时不执行

    try {
      // 遍历所有引擎，逐个打开
      for (const engine of ENGINES) {
        const url = getUrl(engine, query);
        await open(url); // 关键：使用官方 open 函数
        await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms 延迟避免浏览器拦截
      }
    } catch (error) {
      console.error("打开搜索引擎失败:", error);
      // 可选：添加 Toast 提示
      // import { showToast } from "@raycast/api";
      showToast({ style: Toast.Style.Failure, title: "打开失败", message: (error as Error).message });
    }
  };

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="输入搜索关键词..."
      throttle={true} // 防抖，避免输入过快频繁渲染
    >
      {ENGINES.map((engine) => {
        // 计算当前行的标题和副标题
        const title = searchText ? `在 ${engine.name} 搜索` : `打开 ${engine.name}`;
        const subtitle = searchText ? `"${searchText}"` : "访问主页";
        const targetUrl = getUrl(engine, searchText);

        return (
          <List.Item
            key={engine.name}
            title={title}
            subtitle={subtitle}
            icon={engine.icon}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title={title}
                  url={targetUrl}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }} // 默认回车即可，这里仅作展示
                />

                {/* 额外的操作：复制链接 */}
                <Action.CopyToClipboard
                  title="复制搜索链接"
                  content={targetUrl}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}

      {/* 如果用户输入了内容，我们可以加一个额外的 Section 显示通用操作 */}
      {searchText && (
        <List.Section title="其他操作">
          <List.Item
            title="同时在所有引擎搜索"
            icon={Icon.ChevronRight}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {/* 替换为自定义 Action，实现批量打开逻辑 */}
                  <Action
                    title="打开所有搜索引擎"
                    icon={Icon.Globe}
                    onAction={() => openAllSearchEngines(searchText)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

import {
  List,
  showToast,
  Toast,
  getPreferenceValues,
  ActionPanel,
  Action,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useFdSearch } from "./hooks/useFdSearch";
import { FileItem } from "./components/FileItem";
import { Preferences, SearchMode } from "./types";
import { homedir } from "os";

export default function SearchFiles() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [searchScope, setSearchScope] = useState<string>(
    preferences.defaultSearchScope || "home",
  );
  const [searchMode, setSearchMode] = useState<SearchMode>(
    preferences.defaultSearchMode || "glob",
  );

  const {
    data: files,
    isLoading,
    error,
    triggerSearch,
    hasSearchedOnce,
    needsEnterToSearch,
  } = useFdSearch(searchText, searchScope, searchMode);

  console.log("Component state:", {
    isLoading,
    filesCount: files?.length,
    hasSearchedOnce,
    needsEnterToSearch,
    searchScope,
    searchMode,
  });

  // 处理 Enter 键：只在无结果时触发搜索，有结果时默认打开文件
  const handleSearchSubmit = () => {
    console.log("handleSearchSubmit called:", {
      needsEnterToSearch,
      searchTextLength: searchText.length,
      filesLength: files?.length,
      isLoading,
    });

    // 只在真正需要时才响应Enter键搜索
    if (needsEnterToSearch && searchText.length >= 2 && !isLoading) {
      console.log("Triggering search from Enter key");
      triggerSearch();
    }
  };

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message: error.message,
      });
    }
  }, [error]);

  const getNavigationTitle = () => {
    const modeText = `[${searchMode === "glob" ? "Glob" : "RegEx"}]`;
    const statusText = isLoading ? " (Searching...)" : "";
    return `Universal File Search ${modeText}${statusText}`;
  };

  const getSearchBarPlaceholder = () => {
    const modeHint =
      searchMode === "glob" ? " (e.g., *.txt)" : " (e.g., nginx.conf)";

    if (!hasSearchedOnce) {
      return `Type to search${modeHint}, then press Enter...`;
    } else if (!files || files.length === 0) {
      return `No results. Type and press Enter to search again${modeHint}...`;
    } else {
      return `Press Cmd+S to search again${modeHint}...`;
    }
  };

  // 获取搜索路径
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getScopePath = (scope: string): string => {
    switch (scope) {
      case "all":
        return "/";
      case "home":
        return homedir();
      case "downloads":
        return `${homedir()}/Downloads`;
      case "documents":
        return `${homedir()}/Documents`;
      case "applications":
        return "/Applications";
      case "config":
        return "/etc,/opt";
      case "custom": {
        // For old format compatibility
        if (
          preferences.customSearchPaths &&
          !preferences.customSearchPaths.includes(":")
        ) {
          return preferences.customSearchPaths;
        }
        // For new format, return just the paths
        const customPaths = preferences.customSearchPaths || "";
        const paths = customPaths
          .split(",")
          .map((item) => {
            const [, path] = item.split(":");
            return path;
          })
          .filter(Boolean)
          .join(",");
        return paths || homedir();
      }
      default:
        // Handle custom-named paths
        if (scope.startsWith("custom-")) {
          const customPaths = preferences.customSearchPaths || "";
          const items = customPaths.split(",").map((item) => item.trim());
          const index = parseInt(scope.replace("custom-", ""));
          if (items[index]) {
            const [, path] = items[index].split(":");
            return path || homedir();
          }
        }
        return homedir();
    }
  };

  const getEmptyViewContent = () => {
    // fd未安装时显示安装指南
    const isFdNotInstalled = error?.message?.includes("fd is not installed");
    if (isFdNotInstalled) {
      // 智能安装命令 - 检测是否有Homebrew，生成合适的一键安装命令
      const smartInstallCommand = `
# One-click install script for fd
if ! command -v brew &> /dev/null; then
  echo "Installing Homebrew first..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi
echo "Installing fd..."
brew install fd
echo "✅ Installation complete! Please restart Raycast."
`.trim();

      return {
        title: "🔧 fd is not installed",
        description:
          "fd is a fast file search tool required by this extension.\nClick below to copy the installation command.",
        actions: (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Smart Install Command (recommended)"
              content={smartInstallCommand}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onCopy={() =>
                showToast({
                  style: Toast.Style.Success,
                  title: "Smart Install Script Copied!",
                  message: "Paste and run in Terminal",
                })
              }
            />
            <Action.CopyToClipboard
              title="Copy Simple Install (if You Have Homebrew)"
              content="brew install fd"
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onCopy={() =>
                showToast({
                  style: Toast.Style.Success,
                  title: "Command Copied",
                  message: "Run: brew install fd",
                })
              }
            />
            <Action.OpenInBrowser
              title="Open Fd Documentation"
              url="https://github.com/sharkdp/fd#installation"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.Open
              title="Open Terminal"
              target="/System/Applications/Utilities/Terminal.app"
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel>
        ),
      };
    }

    // 搜索中时显示搜索提示
    if (isLoading && (!files || files.length === 0)) {
      return {
        title: "⏳ Searching...",
        description: `Deep searching in ${searchScope === "all" ? "entire system" : searchScope}, please wait...`,
      };
    }

    // 未搜索时显示使用说明
    if (!hasSearchedOnce && !isLoading) {
      return {
        title: "Press Enter to Search",
        description: `Search EVERYTHING on your Mac.\nScope: ${searchScope} | Mode: ${searchMode}\nType at least 2 characters and press Enter.`,
        actions: (
          <ActionPanel>
            <Action
              title="Search with Fd"
              onAction={() => {
                console.log("Action triggered from EmptyView");
                triggerSearch();
              }}
            />
          </ActionPanel>
        ),
      };
    }

    // 搜索过但无结果
    if (
      hasSearchedOnce &&
      files &&
      files.length === 0 &&
      !isLoading &&
      searchText.length > 0
    ) {
      return {
        title: "No Files Found",
        description: "Try different keywords or search scope",
        actions: (
          <ActionPanel>
            <Action
              title="Search Again"
              onAction={() => {
                console.log("Retry search from EmptyView");
                triggerSearch();
              }}
            />
          </ActionPanel>
        ),
      };
    }

    return null;
  };

  const emptyViewContent = getEmptyViewContent();

  return (
    <List
      isLoading={false} // 我们自己控制加载状态
      searchText={searchText}
      onSearchTextChange={(text) => {
        setSearchText(text);
        // Handle submission when Enter is pressed
        if (text === searchText) {
          handleSearchSubmit();
        }
      }}
      navigationTitle={getNavigationTitle()}
      searchBarPlaceholder={getSearchBarPlaceholder()}
      searchBarAccessory={
        <List.Dropdown
          tooltip={`Search: ${searchMode === "glob" ? "Glob Pattern" : "RegEx (Default)"}`}
          value={searchScope}
          onChange={(newValue) => setSearchScope(newValue)}
          storeValue
        >
          <List.Dropdown.Section title="Common Locations">
            <List.Dropdown.Item
              title="🏠 Home Directory"
              value="home"
              icon={Icon.House}
            />
            <List.Dropdown.Item
              title="💻 All System (/)"
              value="all"
              icon={Icon.HardDrive}
            />
            <List.Dropdown.Item
              title="📥 Downloads"
              value="downloads"
              icon={Icon.Download}
            />
            <List.Dropdown.Item
              title="📄 Documents"
              value="documents"
              icon={Icon.Document}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="System">
            <List.Dropdown.Item
              title="🎯 Applications"
              value="applications"
              icon={Icon.AppWindow}
            />
            <List.Dropdown.Item
              title="⚙️ Config Files"
              value="config"
              icon={Icon.Gear}
            />
          </List.Dropdown.Section>
          {preferences.customSearchPaths && (
            <List.Dropdown.Section title="Custom Paths">
              {(() => {
                const customPaths = preferences.customSearchPaths;
                // Support old format (just paths)
                if (!customPaths.includes(":")) {
                  return (
                    <List.Dropdown.Item
                      title="📁 Custom Paths"
                      value="custom"
                      icon={Icon.Folder}
                    />
                  );
                }
                // Support new format (Name:path)
                const items = customPaths.split(",").map((item) => item.trim());
                return items
                  .map((item, index) => {
                    const [name, path] = item.split(":");
                    if (name && path) {
                      return (
                        <List.Dropdown.Item
                          key={`custom-${index}`}
                          title={`📁 ${name}`}
                          value={`custom-${index}`}
                          icon={Icon.Folder}
                        />
                      );
                    }
                    return null;
                  })
                  .filter(Boolean);
              })()}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {/* 空状态视图 - 包括fd未安装的提示 */}
      {emptyViewContent && (!files || files.length === 0) && (
        <List.EmptyView
          title={emptyViewContent?.title || ""}
          description={emptyViewContent?.description || ""}
          actions={
            emptyViewContent?.actions || (
              <ActionPanel>
                <ActionPanel.Section>
                  {searchText.length >= 2 && (
                    <Action
                      title="Search with Fd"
                      onAction={triggerSearch}
                      icon={Icon.MagnifyingGlass}
                      shortcut={{ modifiers: [], key: "return" }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Search Mode (Cmd+M to toggle)">
                  <Action
                    title={`Mode: ${searchMode === "glob" ? "🌟 Glob" : "🔤 RegEx"}`}
                    onAction={() => {
                      setSearchMode(searchMode === "glob" ? "regex" : "glob");
                    }}
                    icon={searchMode === "glob" ? Icon.Stars : Icon.Code}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            )
          }
        />
      )}

      {/* 有结果时的显示 */}
      {files && files.length > 0 && (
        <>
          {/* 搜索中时在第一个位置显示搜索提示 */}
          {isLoading && (
            <List.Item
              title="⏳ Searching..."
              subtitle={`Deep searching in ${searchScope}, please wait...`}
              icon={Icon.MagnifyingGlass}
              accessories={[{ text: "Please wait" }]}
            />
          )}

          {/* 文件列表 */}
          {files.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              hasSearched={hasSearchedOnce}
              onSearch={isLoading ? undefined : triggerSearch}
              onModeChange={(mode) => {
                if (mode === "toggle") {
                  setSearchMode(searchMode === "glob" ? "regex" : "glob");
                } else {
                  setSearchMode(mode as SearchMode);
                }
              }}
            />
          ))}
        </>
      )}
    </List>
  );
}

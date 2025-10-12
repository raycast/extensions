import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

/**
 * 获取 Trae 应用路径
 */
async function getTraePath(): Promise<string> {
  const preferences = getPreferenceValues();

  // 如果用户在设置中指定了路径，直接使用
  if (preferences.traePath) {
    return preferences.traePath;
  }

  // 检查常见的 Trae 安装位置
  const possiblePaths = [
    "/Applications/Trae.app",
    "/Applications/Trae CN.app",
    join(homedir(), "Applications/Trae.app"),
    join(homedir(), "Applications/Trae CN.app"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // 使用 mdfind 命令搜索应用
  try {
    const { stdout } = await execAsync(
      'mdfind "kMDItemCFBundleIdentifier == "com.trae.app""',
    );
    if (stdout.trim()) {
      return stdout.trim();
    }
  } catch (e) {
    // 忽略错误
  }

  throw new Error("not found trae app");
}

/**
 * 使用 Trae 打开文件或目录
 */
async function openWithTrae(path: string): Promise<void> {
  try {
    const traePath = await getTraePath();

    // 使用 open 命令和 -a 参数指定应用程序
    const command = `open -a "${traePath
      .replace("/Contents/MacOS/Electron", "")
      .replace("/Contents/MacOS/Trae", "")
      .replace("/Contents/MacOS/Trae CN", "")}" "${path}"`;

    await execAsync(command);
  } catch (error) {
    // 打开文件失败
    await showToast({
      style: Toast.Style.Failure,
      title: "failed to open file",
      message: error instanceof Error ? error.message : "unknown error",
    });
  }
}

interface FileItem {
  path: string;
  name: string;
  type: "file" | "directory";
  modifiedAt: Date;
}

/**
 * 搜索文件和目录 - 优化搜索范围，排除系统目录
 */
function searchFiles(query: string): FileItem[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const results: FileItem[] = [];
  const lowerQuery = query.toLowerCase().trim();

  // 优化的搜索路径：用户常用目录，排除系统目录
  const searchPaths = [
    homedir(), // 用户主目录
    join(homedir(), "Desktop"), // 桌面
    join(homedir(), "Documents"), // 文档
    join(homedir(), "Downloads"), // 下载
  ];

  // 要排除的系统目录和构建目录
  const excludeDirs = [
    "Applications",
    "System",
    "Library",
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    ".vscode",
    ".idea",
    "__pycache__",
    "build",
    "dist",
    "target",
    ".next",
    ".nuxt",
    "vendor",
    "bin",
    "obj",
    "out",
    "logs",
    "temp",
    "tmp",
  ];

  // 要排除的文件扩展名（临时文件、日志等）
  const excludeExtensions = [
    ".log",
    ".tmp",
    ".temp",
    ".cache",
    ".lock",
    ".pid",
    ".seed",
  ];

  function searchInPath(path: string, depth = 0) {
    if (depth > 4 || results.length >= 50) return; // 限制深度和结果数量

    try {
      if (!existsSync(path)) return;
      const items = readdirSync(path);

      for (const item of items) {
        // 跳过隐藏文件和排除目录
        if (item.startsWith(".")) continue;
        if (excludeDirs.includes(item)) continue;

        const itemPath = join(path, item);
        const itemLower = item.toLowerCase();

        // 检查文件扩展名是否被排除
        const ext = item.slice(item.lastIndexOf("."));
        if (excludeExtensions.includes(ext)) continue;

        // 检查文件名是否匹配搜索词
        if (itemLower.includes(lowerQuery)) {
          try {
            const stat = statSync(itemPath);
            results.push({
              path: itemPath,
              name: item,
              type: stat.isDirectory() ? "directory" : "file",
              modifiedAt: stat.mtime,
            });
          } catch (e) {
            // 忽略无法访问的文件
          }
        }

        // 递归搜索子目录
        if (depth < 3) {
          try {
            const stat = statSync(itemPath);
            if (stat.isDirectory()) {
              searchInPath(itemPath, depth + 1);
            }
          } catch (e) {
            // 忽略无法访问的目录
          }
        }
      }
    } catch (e) {
      // 忽略无法访问的路径
    }
  }

  // 并行搜索所有路径
  searchPaths.forEach((searchPath) => {
    if (existsSync(searchPath)) {
      searchInPath(searchPath, 0);
    }
  });

  // 按相关性排序：完全匹配优先，然后按修改时间
  const uniqueResults = results
    .filter(
      (item, index, self) =>
        self.findIndex((t) => t.path === item.path) === index,
    )
    .sort((a, b) => {
      const aExactMatch = a.name.toLowerCase() === lowerQuery;
      const bExactMatch = b.name.toLowerCase() === lowerQuery;

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 然后按修改时间排序
      return b.modifiedAt.getTime() - a.modifiedAt.getTime();
    })
    .slice(0, 50); // 显示更多结果

  return uniqueResults;
}

export default function Command(props: LaunchProps) {
  // 使用 arguments 中的 query 作为初始搜索文本
  const initialQuery = props.arguments?.query || "";
  const [searchText, setSearchText] = useState(initialQuery);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialSearchDone, setInitialSearchDone] = useState(false);

  // 初始搜索 - 只在有初始查询时执行
  useEffect(() => {
    if (initialQuery.trim() && !initialSearchDone) {
      setIsLoading(true);
      const searchResults = searchFiles(initialQuery);
      setFiles(searchResults);
      setIsLoading(false);
      setInitialSearchDone(true);
    }
  }, [initialQuery, initialSearchDone]);

  // 搜索文本变化处理 - 允许所有输入，包括空字符串
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
  };

  // 用户输入搜索 - 监听搜索文本变化
  useEffect(() => {
    // 如果是初始查询且还没处理，跳过
    if (!initialSearchDone && searchText === initialQuery) {
      return;
    }

    if (!searchText.trim()) {
      setFiles([]);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      const searchResults = searchFiles(searchText);
      setFiles(searchResults);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, initialQuery, initialSearchDone]);

  return (
    <List
      searchBarPlaceholder="Search for files or folders..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      isLoading={isLoading}
      throttle
    >
      {files.length === 0 && searchText.trim() ? (
        <List.EmptyView
          title="No files found"
          description={`No files or folders found containing "${searchText.trim()}"`}
        />
      ) : files.length === 0 ? (
        <List.EmptyView
          title="No files found"
          description="Search for files or folders on your Mac"
        />
      ) : (
        files.map((file) => (
          <List.Item
            key={file.path}
            title={file.name}
            subtitle={file.path}
            icon={{ fileIcon: file.path }}
            actions={
              <ActionPanel>
                <Action
                  title="Open with Trae"
                  onAction={async () => {
                    await openWithTrae(file.path);
                  }}
                />
                <Action.ShowInFinder
                  path={file.path}
                  title="Show in Finder"
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
                <Action.CopyToClipboard
                  content={file.path}
                  title="Copy Path"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

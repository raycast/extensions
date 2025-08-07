import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { siyuanAPI } from "./api/siyuan";
import { AssetFile } from "./types";
import path from "path";

interface Preferences {
  workspacePath: string;
}

export default function FindAssets() {
  const [searchText, setSearchText] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const preferences = getPreferenceValues<Preferences>();

  // 稳定的搜索文本处理函数，避免频繁重新渲染导致焦点丢失
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  // 使用防抖来减少频繁查询
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300); // 减少延迟时间，提升响应性

    return () => {
      clearTimeout(timer);
    };
  }, [searchText]);

  // 检查工作空间配置
  const checkWorkspaceConfig = () => {
    if (!preferences.workspacePath || preferences.workspacePath.trim() === "") {
      return false;
    }
    return true;
  };

  // 搜索 assets 文件（使用防抖后的搜索文本）
  const { isLoading, data: rawAssets = [] } = useCachedPromise(
    async (query: string, type: string) => {
      try {
        // 检查工作空间配置
        if (!checkWorkspaceConfig()) {
          throw new Error("请先配置 SiYuan 工作空间路径");
        }

        const fileType =
          type === "all" ? undefined : (type as AssetFile["type"]);
        return await siyuanAPI.searchAssets(query, fileType);
      } catch (error) {
        console.error("搜索 assets 文件失败:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "搜索失败",
          message: error instanceof Error ? error.message : "未知错误",
        });
        return [];
      }
    },
    [debouncedSearchText, filterType],
    {
      keepPreviousData: true,
      execute: checkWorkspaceConfig(), // 只在配置正确时执行
    },
  );

  // 排序后的文件列表（按名称排序）- 使用 useMemo 避免频繁重新计算
  const assets = useMemo(() => {
    return [...rawAssets].sort((a, b) => {
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }, [rawAssets]);

  // 限制同时显示的文件数量，避免渲染过多项目
  const maxDisplayItems = 100;
  const displayAssets = useMemo(() => {
    return assets.slice(0, maxDisplayItems);
  }, [assets, maxDisplayItems]);

  // 统计信息 - 使用 useMemo 避免频繁重新计算
  const { totalFiles, totalSize } = useMemo(() => {
    return {
      totalFiles: assets.length,
      totalSize: assets.reduce((sum, file) => sum + file.size, 0),
    };
  }, [assets]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // 格式化时间为日期（不显示具体时间）
  const formatDate = (timeStr: string): string => {
    if (!timeStr) return "未知日期";
    try {
      // SiYuan 时间格式: YYYYMMDDHHMMSS
      if (timeStr.length === 14) {
        const year = timeStr.substring(0, 4);
        const month = timeStr.substring(4, 6);
        const day = timeStr.substring(6, 8);
        return `${year}-${month}-${day}`;
      }

      // ISO 格式时间
      if (timeStr.includes("T") || timeStr.includes("-")) {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return date
            .toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .replace(/\//g, "-");
        }
      }

      return timeStr.substring(0, 10); // 取前10位作为日期
    } catch {
      return timeStr;
    }
  };

  // 引用信息缓存
  const [referenceCache, setReferenceCache] = useState<
    Record<
      string,
      {
        doc_id: string;
        doc_title: string;
        doc_path: string;
        updated: string;
      } | null
    >
  >({});
  const [loadingReferences, setLoadingReferences] = useState<Set<string>>(
    new Set(),
  );
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  // 限制并发请求数量
  const maxConcurrentRequests = 3;
  const [requestQueue, setRequestQueue] = useState<string[]>([]);
  const [activeRequests, setActiveRequests] = useState(0);

  // 懒加载引用信息 - 优化版本
  const loadReferenceInfo = async (fileName: string) => {
    if (
      referenceCache[fileName] !== undefined ||
      loadingReferences.has(fileName)
    ) {
      return; // 已加载或正在加载
    }

    // 如果达到最大并发数，将请求加入队列
    if (activeRequests >= maxConcurrentRequests) {
      setRequestQueue((prev) => [...prev, fileName]);
      return;
    }

    setLoadingReferences((prev) => new Set(prev).add(fileName));
    setActiveRequests((prev) => prev + 1);

    try {
      const reference = await siyuanAPI.findAssetReference(fileName);
      setReferenceCache((prev) => ({
        ...prev,
        [fileName]: reference,
      }));
    } catch (error) {
      console.error("加载引用信息失败:", error);
      // 失败时也要记录到缓存中，避免重复请求
      setReferenceCache((prev) => ({
        ...prev,
        [fileName]: null,
      }));
    } finally {
      setLoadingReferences((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
      setActiveRequests((prev) => prev - 1);

      // 处理队列中的下一个请求
      setRequestQueue((queue) => {
        if (queue.length > 0) {
          const nextFileName = queue[0];
          const remainingQueue = queue.slice(1);
          setTimeout(() => loadReferenceInfo(nextFileName), 100);
          return remainingQueue;
        }
        return queue;
      });
    }
  };

  // 当项目变为可见时才加载引用信息
  const handleItemVisible = (fileName: string) => {
    if (!visibleItems.has(fileName)) {
      setVisibleItems((prev) => new Set(prev).add(fileName));
      // 延迟加载，避免同时触发大量请求
      setTimeout(() => loadReferenceInfo(fileName), Math.random() * 1000 + 200);
    }
  };

  // 获取文件的引用信息文本
  const getFileSubtitle = (file: AssetFile): string => {
    const cachedReference = referenceCache[file.name];
    if (cachedReference) {
      const refDate = formatDate(cachedReference.updated);
      return `被引用于: ${cachedReference.doc_title} • ${refDate}`;
    }
    return `文件大小: ${formatFileSize(file.size)} • 修改日期: ${formatDate(file.modTime)}`;
  };

  // 获取引用文档的跳转URL
  const getReferenceUrl = (fileName: string): string | null => {
    const cachedReference = referenceCache[fileName];
    return cachedReference ? siyuanAPI.getDocUrl(cachedReference.doc_id) : null;
  };

  // 获取文件图标
  const getFileIcon = (file: AssetFile) => {
    switch (file.type) {
      case "image":
        return { source: Icon.Image, tintColor: Color.Green };
      case "document":
        return { source: Icon.Document, tintColor: Color.Blue };
      case "archive":
        return { source: Icon.Box, tintColor: Color.Orange };
      case "video":
        return { source: Icon.Video, tintColor: Color.Purple };
      case "audio":
        return { source: Icon.Music, tintColor: Color.Red };
      default:
        return { source: Icon.Document, tintColor: Color.SecondaryText };
    }
  };

  // 复制内容到剪贴板
  const copyToClipboard = async (content: string, message: string) => {
    try {
      await Clipboard.copy(content);
      showToast({
        style: Toast.Style.Success,
        title: message,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "复制失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 复制文件到桌面
  const copyFileToDesktop = async (file: AssetFile) => {
    try {
      if (!file.fullPath) {
        throw new Error("无法获取文件路径");
      }

      const desktopPath = path.join(process.env.HOME || "", "Desktop");
      const destinationPath = path.join(desktopPath, file.name);

      // 使用 fs 模块复制文件
      const fs = await import("fs/promises");

      // 检查目标文件是否已存在
      try {
        await fs.access(destinationPath);
        // 如果文件已存在，生成新的文件名
        const nameWithoutExt = path.parse(file.name).name;
        const ext = path.parse(file.name).ext;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const newName = `${nameWithoutExt}_${timestamp}${ext}`;
        const newDestinationPath = path.join(desktopPath, newName);
        await fs.copyFile(file.fullPath, newDestinationPath);

        showToast({
          style: Toast.Style.Success,
          title: "文件已复制到桌面",
          message: `已重命名为: ${newName}`,
        });
      } catch {
        // 文件不存在，直接复制
        await fs.copyFile(file.fullPath, destinationPath);

        showToast({
          style: Toast.Style.Success,
          title: "文件已复制到桌面",
          message: file.name,
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "复制文件失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 测试连接
  const testConnection = async () => {
    try {
      const isConnected = await siyuanAPI.testConnection();
      if (isConnected) {
        showToast({
          style: Toast.Style.Success,
          title: "连接成功",
          message: "SiYuan 服务器连接正常",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "连接失败",
          message: "无法连接到 SiYuan 服务器",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "连接测试失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder={`搜索 assets 附件文件... (共 ${totalFiles} 个文件，显示前 ${Math.min(maxDisplayItems, totalFiles)} 个，${formatFileSize(totalSize)})`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="按文件类型筛选"
          storeValue={true}
          onChange={setFilterType}
        >
          <List.Dropdown.Item title="全部文件" value="all" />
          <List.Dropdown.Item title="图片" value="image" />
          <List.Dropdown.Item title="文档" value="document" />
          <List.Dropdown.Item title="压缩包" value="archive" />
          <List.Dropdown.Item title="视频" value="video" />
          <List.Dropdown.Item title="音频" value="audio" />
          <List.Dropdown.Item title="其他" value="other" />
        </List.Dropdown>
      }
    >
      {assets.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title={
            !checkWorkspaceConfig()
              ? "需要配置工作空间路径"
              : searchText
                ? "未找到匹配的文件"
                : "开始搜索"
          }
          description={
            !checkWorkspaceConfig()
              ? "请在扩展设置中配置 SiYuan 工作空间路径，才能搜索 assets 文件"
              : searchText
                ? `未找到包含 "${searchText}" 的文件`
                : "输入关键词来搜索 assets 文件夹中的附件"
          }
          actions={
            <ActionPanel>
              {!checkWorkspaceConfig() ? (
                <Action
                  title="打开扩展设置"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                  shortcut={{ modifiers: ["cmd"], key: "comma" }}
                />
              ) : null}
              <Action
                title="测试连接"
                icon={Icon.Wifi}
                onAction={testConnection}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        displayAssets.map((file) => (
          <List.Item
            key={file.fullPath}
            icon={getFileIcon(file)}
            title={file.name}
            subtitle={getFileSubtitle(file)}
            accessories={[
              { text: file.extension.toUpperCase() },
              {
                text: formatFileSize(file.size),
                tooltip: `文件大小: ${formatFileSize(file.size)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="文件操作">
                  <Action.Open
                    title="打开文件"
                    icon={Icon.ArrowNe}
                    target={file.fullPath}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  {(() => {
                    // 当用户查看Action面板时才触发懒加载
                    handleItemVisible(file.name);

                    const referenceUrl = getReferenceUrl(file.name);
                    return referenceUrl ? (
                      <Action.OpenInBrowser
                        title="在 Siyuan 中打开引用文档"
                        icon={Icon.Document}
                        url={referenceUrl}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    ) : null;
                  })()}
                  <Action.ShowInFinder
                    title="在 Finder 中显示"
                    path={file.fullPath}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  <Action
                    title="复制到桌面"
                    icon={Icon.Desktop}
                    onAction={() => copyFileToDesktop(file)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="复制信息">
                  <Action
                    title="复制文件路径"
                    icon={Icon.Clipboard}
                    onAction={() =>
                      copyToClipboard(file.fullPath, "文件路径已复制")
                    }
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="复制文件名"
                    icon={Icon.Text}
                    onAction={() => copyToClipboard(file.name, "文件名已复制")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="复制相对路径"
                    icon={Icon.Link}
                    onAction={() =>
                      copyToClipboard(
                        `assets/${file.name}`,
                        "相对路径已复制（可用于 SiYuan 引用）",
                      )
                    }
                    shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="其他操作">
                  <Action
                    title="测试连接"
                    icon={Icon.Wifi}
                    onAction={testConnection}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
      {assets.length > maxDisplayItems && (
        <List.Item
          title={`还有 ${assets.length - maxDisplayItems} 个文件未显示`}
          subtitle="请使用搜索功能缩小范围"
          icon={{ source: Icon.Info, tintColor: Color.Orange }}
        />
      )}
    </List>
  );
}

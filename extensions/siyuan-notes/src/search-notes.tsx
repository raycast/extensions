import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  LaunchProps,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { siyuanAPI } from "./api/siyuan";
import { SiYuanBlock } from "./types";

interface Arguments {
  query: string;
  path?: string;
}

export default function SearchNotes(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { query, path } = props.arguments;
  // 使用传入的query参数作为初始搜索文本，如果没有则为空字符串
  const [searchText, setSearchText] = useState<string>(query || "");
  const [filterType, setFilterType] = useState<string>("all");
  // 使用传入的path参数作为初始路径筛选
  const [selectedPath] = useState<string>(path || "");
  const [detailContentMap, setDetailContentMap] = useState<
    Record<string, string>
  >({});
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [filePathsMap, setFilePathsMap] = useState<
    Record<
      string,
      { text: string; path: string; isAsset: boolean; originalPath: string }[]
    >
  >({});

  // 获取笔记本列表 (暂时保留以备将来使用)
  // const { data: notebooks = [] } = useCachedPromise(
  //   async () => {
  //     try {
  //       return await siyuanAPI.getNotebooks();
  //     } catch (error) {
  //       console.error("获取笔记本失败:", error);
  //       return [];
  //     }
  //   },
  //   [],
  //   {
  //     keepPreviousData: true,
  //   },
  // );

  // 搜索数据
  const { isLoading, data: searchData } = useCachedPromise(
    async (query: string) => {
      if (!query.trim()) {
        return { blocks: [], matchedPaths: [], matchedNotebooks: [] };
      }

      const searchResult = await siyuanAPI.searchNotes(
        query,
        undefined, // 不再使用笔记本ID筛选
        selectedPath || undefined, // 使用路径筛选
      );
      return {
        blocks: searchResult.blocks || [],
        matchedPaths: searchResult.matchedPaths || [],
        matchedNotebooks: searchResult.matchedNotebooks || [],
      };
    },
    [searchText, selectedPath],
    {
      keepPreviousData: true,
      onError: (error) => {
        console.error("搜索失败:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "搜索失败",
          message: error instanceof Error ? error.message : "未知错误",
        });
      },
    },
  );

  const results = searchData?.blocks || [];
  const matchedPaths = searchData?.matchedPaths || [];
  const matchedNotebooks = searchData?.matchedNotebooks || [];

  // 加载特定项目的详情内容
  const loadItemDetail = async (item: SiYuanBlock) => {
    if (detailContentMap[item.id]) {
      // 已经加载过了
      return;
    }

    try {
      setLoadingItems((prev) => new Set(prev).add(item.id));

      let content: string;
      let rawContent: string;

      if (item.isDocument) {
        // 如果是文档，获取完整内容
        const documentContent = await siyuanAPI.getDocumentContent(item.id);
        rawContent = documentContent || "";
        content = documentContent || `# ${item.content}\n\n暂无内容`;
      } else {
        // 如果是块，显示块内容和文档信息
        const documentTitle = item.doc_title || "未知文档";
        const blockContent = item.markdown || item.content || "无内容";
        rawContent = blockContent;
        // 处理本地文件链接用于显示
        const processedContent = siyuanAPI.processLocalFileLinks(blockContent);
        content = `# ${documentTitle}\n\n## 块内容\n\n${processedContent}`;
      }

      // 提取文件路径
      const filePaths = siyuanAPI.extractLocalFilePaths(rawContent);
      setFilePathsMap((prev) => ({
        ...prev,
        [item.id]: filePaths,
      }));

      setDetailContentMap((prev) => ({
        ...prev,
        [item.id]: content,
      }));
    } catch (error) {
      console.error("加载详情失败:", error);
      const errorContent = `# 加载失败\n\n${error instanceof Error ? error.message : "未知错误"}`;
      setDetailContentMap((prev) => ({
        ...prev,
        [item.id]: errorContent,
      }));
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
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

  const copyContent = async (content: string) => {
    try {
      await Clipboard.copy(content);
      showToast({
        style: Toast.Style.Success,
        title: "已复制到剪贴板",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "复制失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 文件动作组件 - 使用Raycast的Action.Open组件
  const FileAction = ({
    file,
    index,
  }: {
    file: {
      text: string;
      path: string;
      isAsset: boolean;
      originalPath: string;
    };
    index: number;
  }) => {
    const localPath = siyuanAPI.getLocalFilePath(file.path);

    console.log(
      `[DEBUG] FileAction - Original path: ${file.path}, Resolved path: ${localPath}`,
    );

    if (localPath) {
      return (
        <Action.Open
          title={`${file.text}`}
          icon={Icon.Document}
          target={localPath}
          shortcut={
            index < 9
              ? {
                  modifiers: ["cmd", "alt"],
                  key: (index + 1).toString() as
                    | "1"
                    | "2"
                    | "3"
                    | "4"
                    | "5"
                    | "6"
                    | "7"
                    | "8"
                    | "9",
                }
              : undefined
          }
        />
      );
    }

    console.log(`[DEBUG] FileAction - No local path found for: ${file.path}`);
    return null; // 没有找到本地路径则不显示此选项
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case "d":
        return { source: Icon.Document, tintColor: Color.Blue };
      case "h":
        return { source: Icon.Hashtag, tintColor: Color.Purple };
      case "p":
        return { source: Icon.Text, tintColor: Color.SecondaryText };
      case "l":
        return { source: Icon.List, tintColor: Color.Green };
      case "t":
        return { source: Icon.List, tintColor: Color.Orange };
      case "c":
        return { source: Icon.Code, tintColor: Color.Red };
      default:
        return { source: Icon.Document, tintColor: Color.SecondaryText };
    }
  };

  const getAccessories = () => {
    const accessories: Array<{ text?: string; tooltip?: string }> = [];
    // 不显示时间，保持界面简洁
    return accessories;
  };

  // 筛选结果 - 现在只需要按类型筛选，笔记本筛选已经在API层处理
  const filteredResults = results.filter((item) => {
    // 按类型筛选
    let typeMatch = true;
    if (filterType === "documents") typeMatch = Boolean(item.isDocument);
    else if (filterType === "blocks") typeMatch = !item.isDocument;

    return typeMatch;
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        selectedPath && (matchedPaths.length > 0 || matchedNotebooks.length > 0)
          ? `在 ${matchedNotebooks.length} 个笔记本、${matchedPaths.length} 个路径中搜索...`
          : selectedPath
            ? `筛选关键词 "${selectedPath}"...`
            : "搜索笔记内容、标题或标签..."
      }
      throttle
      isShowingDetail={filteredResults.length > 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="按类型筛选搜索结果"
          storeValue={true}
          onChange={setFilterType}
        >
          <List.Dropdown.Item title="全部类型" value="all" />
          <List.Dropdown.Item title="文档" value="documents" />
          <List.Dropdown.Item title="块" value="blocks" />
        </List.Dropdown>
      }
    >
      {filteredResults.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={
            selectedPath &&
            matchedPaths.length === 0 &&
            matchedNotebooks.length === 0 &&
            searchText
              ? "未找到匹配的笔记本或路径"
              : searchText
                ? "未找到相关笔记"
                : "开始搜索"
          }
          description={
            selectedPath &&
            matchedPaths.length === 0 &&
            matchedNotebooks.length === 0 &&
            searchText
              ? `关键词 "${selectedPath}" 未匹配到任何笔记本或文档路径`
              : searchText
                ? selectedPath
                  ? `在筛选条件下未找到包含 "${searchText}" 的笔记`
                  : "尝试使用不同的关键词搜索"
                : "输入关键词来搜索您的笔记"
          }
          actions={
            <ActionPanel>
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
        filteredResults.map((block) => {
          // 当这个item可能被选中时，预加载内容
          const isLoading = loadingItems.has(block.id);
          const content = detailContentMap[block.id] || "加载中...";

          // 如果还没有内容且不在加载中，启动加载
          if (!detailContentMap[block.id] && !isLoading) {
            loadItemDetail(block);
          }

          return (
            <List.Item
              key={block.id}
              icon={getBlockIcon(block.type)}
              title={
                block.isDocument
                  ? block.content
                  : block.content.substring(0, 80)
              }
              subtitle={`${block.notebook_name || "未知笔记本"} · ${block.hpath || block.doc_path || "未知路径"}`}
              accessories={getAccessories(block)}
              detail={
                <List.Item.Detail isLoading={isLoading} markdown={content} />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={siyuanAPI.getDocUrl(
                      block.isDocument
                        ? block.id
                        : block.rootID || block.root_id || block.id,
                    )}
                    title="在思源笔记中打开"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />

                  {/* 添加文件打开动作 */}
                  {filePathsMap[block.id]?.length > 0 && (
                    <ActionPanel.Section title="打开文件">
                      {filePathsMap[block.id]
                        .map((file, index) => {
                          const localPath = siyuanAPI.getLocalFilePath(
                            file.path,
                          );

                          // 只保留用默认应用打开的选项
                          if (localPath) {
                            return (
                              <FileAction
                                key={`${block.id}-file-${index}-local`}
                                file={file}
                                index={index}
                              />
                            );
                          }

                          return null;
                        })
                        .filter(Boolean)}
                    </ActionPanel.Section>
                  )}

                  <ActionPanel.Section title="其他操作">
                    <Action
                      title="复制内容"
                      icon={Icon.Clipboard}
                      onAction={() =>
                        copyContent(block.markdown || block.content)
                      }
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="复制链接"
                      icon={Icon.Link}
                      onAction={() =>
                        copyContent(`siyuan://blocks/${block.id}`)
                      }
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
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
          );
        })
      )}
    </List>
  );
}

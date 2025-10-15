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
  getFrontmostApplication,
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
  const [pasteContentMap, setPasteContentMap] = useState<
    Record<string, string>
  >({});
  const [referenceStatusMap, setReferenceStatusMap] = useState<
    Record<string, boolean>
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
        console.error("Search failed:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: error instanceof Error ? error.message : "Unknown error",
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
      let pasteContent: string;

      if (item.isDocument) {
        // 如果是文档，获取完整内容
        const documentContent = await siyuanAPI.getDocumentContent(item.id);
        rawContent = documentContent || "";
        content = documentContent || `# ${item.content}\n\n暂无内容`;
        // 用于粘贴的内容就是完整的文档内容
        pasteContent = rawContent;
      } else {
        // 如果是块，显示块内容和文档信息
        const documentTitle = item.doc_title || "未知文档";
        const blockContent = item.markdown || item.content || "无内容";
        rawContent = blockContent;
        // 处理本地文件链接用于显示
        const processedContent = siyuanAPI.processLocalFileLinks(blockContent);
        content = `# ${documentTitle}\n\n## 块内容\n\n${processedContent}`;
        // 用于粘贴的内容是原始的块内容
        pasteContent = rawContent;
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

      setPasteContentMap((prev) => ({
        ...prev,
        [item.id]: pasteContent,
      }));

      // 检查是否有引用记录
      const hasRefs = await siyuanAPI.hasReferences(item.id);
      setReferenceStatusMap((prev) => ({
        ...prev,
        [item.id]: hasRefs,
      }));
    } catch (error) {
      console.error("Failed to load details:", error);
      const errorContent = `# Loading Failed\n\n${error instanceof Error ? error.message : "Unknown error"}`;
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

  // Test connection
  const testConnection = async () => {
    try {
      const isConnected = await siyuanAPI.testConnection();
      if (isConnected) {
        showToast({
          style: Toast.Style.Success,
          title: "Connection Successful",
          message: "SiYuan server connection is working",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Connection Failed",
          message: "Unable to connect to SiYuan server",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Test Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const copyContent = async (content: string) => {
    try {
      await Clipboard.copy(content);
      showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Copy Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Smart paste function - record reference and paste content
  const smartPaste = async (block: SiYuanBlock) => {
    try {
      // Get current active application info
      const frontmostApp = await getFrontmostApplication();
      const appName = frontmostApp.name || "Unknown App";

      // Get content to paste
      const contentToPaste =
        pasteContentMap[block.id] || block.markdown || block.content;

      if (!contentToPaste) {
        showToast({
          style: Toast.Style.Failure,
          title: "Paste Failed",
          message: "Content is empty",
        });
        return;
      }

      // Paste content first
      await Clipboard.paste(contentToPaste);

      // Record reference info (async, non-blocking)
      recordReference(block, appName)
        .then(() => {
          // Update reference status
          setReferenceStatusMap((prev) => ({
            ...prev,
            [block.id]: true,
          }));
        })
        .catch((error) => {
          console.error("Failed to record reference:", error);
          // Don't show error toast to avoid disrupting user experience
        });

      showToast({
        style: Toast.Style.Success,
        title: "Pasted to Current App",
        message: `Reference recorded in ${appName}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Paste Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Record reference info
  const recordReference = async (block: SiYuanBlock, appName: string) => {
    try {
      // Add reference record using API
      await siyuanAPI.addReferenceRecord(block.id, appName);
      console.log(
        `Successfully recorded reference for block ${block.id} in ${appName}`,
      );
    } catch (error) {
      console.error("Failed to record reference:", error);
      throw error;
    }
  };

  // View reference details
  const viewReferenceDetails = async (block: SiYuanBlock) => {
    try {
      const [references, stats] = await Promise.all([
        siyuanAPI.getBlockReferences(block.id),
        siyuanAPI.getReferenceStats(block.id),
      ]);

      let detailsText = `# Reference Details - ${block.isDocument ? "Document" : "Block"}\n\n`;
      detailsText += `**Title**: ${block.content.substring(0, 50)}${block.content.length > 50 ? "..." : ""}\n\n`;

      if (stats.totalReferences === 0) {
        detailsText += `No reference records`;
      } else {
        detailsText += `## Statistics\n\n`;
        detailsText += `- **Total References**: ${stats.totalReferences}\n`;
        detailsText += `- **Unique Apps**: ${stats.uniqueApps}\n`;
        detailsText += `- **Last Reference Time**: ${stats.lastReferenceTime || "Unknown"}\n\n`;

        detailsText += `## References by App\n\n`;
        Object.entries(stats.appCounts).forEach(([app, count]) => {
          detailsText += `- **${app}**: ${count} times\n`;
        });

        detailsText += `\n## Detailed Records\n\n`;
        references.forEach((ref, index) => {
          detailsText += `${index + 1}. **${ref.app}** - ${ref.timestamp}\n`;
        });
      }

      await copyContent(detailsText);
      showToast({
        style: Toast.Style.Success,
        title: "Reference Details Copied",
        message: `Contains ${stats.totalReferences} reference records`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Get Reference Details",
        message: error instanceof Error ? error.message : "Unknown error",
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

  const getAccessories = (block: SiYuanBlock) => {
    const accessories: Array<{ text?: string; tooltip?: string }> = [];

    // Show reference indicator if block has reference records
    if (referenceStatusMap[block.id]) {
      accessories.push({
        text: "🔖",
        tooltip: "This content has been referenced in other apps",
      });
    }

    // Don't show time to keep interface clean
    return accessories;
  };

  // Filter results - now only filter by type, notebook filtering is handled at API layer
  const filteredResults = results.filter((item) => {
    // Filter by type
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
          ? `Searching in ${matchedNotebooks.length} notebooks, ${matchedPaths.length} paths...`
          : selectedPath
            ? `Filter keyword "${selectedPath}"...`
            : "Search note content, titles or tags..."
      }
      throttle
      isShowingDetail={filteredResults.length > 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter search results by type"
          storeValue={true}
          onChange={setFilterType}
        >
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Item title="Documents" value="documents" />
          <List.Dropdown.Item title="Blocks" value="blocks" />
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
              ? "No Matching Notebooks or Paths Found"
              : searchText
                ? "No Related Notes Found"
                : "Start Searching"
          }
          description={
            selectedPath &&
            matchedPaths.length === 0 &&
            matchedNotebooks.length === 0 &&
            searchText
              ? `Keyword "${selectedPath}" did not match any notebooks or document paths`
              : searchText
                ? selectedPath
                  ? `No notes containing "${searchText}" found under current filter`
                  : "Try searching with different keywords"
                : "Enter keywords to search your notes"
          }
          actions={
            <ActionPanel>
              <Action
                title="Test Connection"
                icon={Icon.Wifi}
                onAction={testConnection}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredResults.map((block) => {
          // Preload content when item might be selected
          const isLoading = loadingItems.has(block.id);
          const content = detailContentMap[block.id] || "Loading...";

          // Start loading if content not available and not already loading
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
              subtitle={`${block.notebook_name || "Unknown Notebook"} · ${block.hpath || block.doc_path || "Unknown Path"}`}
              accessories={getAccessories(block)}
              detail={
                <List.Item.Detail isLoading={isLoading} markdown={content} />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Paste to Current App"
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                    onAction={() => smartPaste(block)}
                  />
                  <Action.OpenInBrowser
                    url={siyuanAPI.getDocUrl(
                      block.isDocument
                        ? block.id
                        : block.rootID || block.root_id || block.id,
                    )}
                    title="Open in Siyuan"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />

                  {/* Add file open actions */}
                  {filePathsMap[block.id]?.length > 0 && (
                    <ActionPanel.Section title="Open Files">
                      {filePathsMap[block.id]
                        .map((file, index) => {
                          const localPath = siyuanAPI.getLocalFilePath(
                            file.path,
                          );

                          // Only keep open with default app option
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

                  <ActionPanel.Section title="Other Actions">
                    <Action
                      title="Copy Content"
                      icon={Icon.Clipboard}
                      onAction={() =>
                        copyContent(block.markdown || block.content)
                      }
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Copy Link"
                      icon={Icon.Link}
                      onAction={() =>
                        copyContent(`siyuan://blocks/${block.id}`)
                      }
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    {referenceStatusMap[block.id] && (
                      <Action
                        title="View Reference Details"
                        icon={Icon.List}
                        onAction={() => viewReferenceDetails(block)}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    )}
                    <Action
                      title="Test Connection"
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

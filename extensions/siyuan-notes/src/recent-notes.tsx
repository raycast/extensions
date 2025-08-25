import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Clipboard,
  Detail,
} from "@raycast/api";
import { siyuanAPI } from "./api/siyuan";
import { SiYuanBlock } from "./types";

// 解析SiYuan时间戳为Date对象 (格式: "20250730224544")
function parseSiYuanTime(timestamp: string): Date | null {
  if (!timestamp || timestamp.length !== 14) {
    return null;
  }

  try {
    // 解析格式: YYYYMMDDHHMMSS
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);

    const date = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`,
    );

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    return null;
  }
}

// 格式化SiYuan时间戳 (格式: "20250730224544")
function formatSiYuanTime(timestamp: string): string {
  const date = parseSiYuanTime(timestamp);
  if (!date) {
    return "无效时间";
  }
  return date.toLocaleString("zh-CN");
}

// 笔记详情组件 - 显示完整文档内容
function NoteDetail({ block }: { block: SiYuanBlock }) {
  const [documentContent, setDocumentContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [filePaths, setFilePaths] = useState<
    { text: string; path: string; isAsset: boolean; originalPath: string }[]
  >([]);

  useEffect(() => {
    const loadDocumentContent = async () => {
      try {
        setLoading(true);
        console.log(`开始加载文档内容: ${block.id}`);

        // 获取完整的文档内容
        const content = await siyuanAPI.getDocumentContent(block.id);
        console.log(`获取到的文档内容: ${content}`);

        if (content && content.trim()) {
          setDocumentContent(content);
          // 提取文件路径
          const extractedPaths = siyuanAPI.extractLocalFilePaths(content);
          setFilePaths(extractedPaths);
        } else {
          // 如果获取不到内容，显示基本信息
          setDocumentContent(
            `# ${block.content || "无标题"}\n\n暂无内容或无法获取文档内容`,
          );
        }
      } catch (error) {
        console.error("获取文档内容失败:", error);
        setDocumentContent(
          `# ${block.content || "无标题"}\n\n获取内容时发生错误: ${error instanceof Error ? error.message : "未知错误"}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadDocumentContent();
  }, [block.id]);

  // 构建笔记的markdown内容 - 显示完整的文档内容
  const markdown = loading
    ? "加载中..."
    : documentContent || block.markdown || block.content || "无内容";

  // processLocalFileLinks已经将文件链接转换为file://协议，可以直接点击在Finder中显示

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
      `[DEBUG] FileAction (Recent Notes) - Original path: ${file.path}, Resolved path: ${localPath}`,
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

    console.log(
      `[DEBUG] FileAction (Recent Notes) - No local path found for: ${file.path}`,
    );
    return null;
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={block.content || "文档详情"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="文档ID" text={block.id} />
          <Detail.Metadata.Label
            title="笔记本"
            text={block.notebook_name || "未知笔记本"}
          />
          <Detail.Metadata.Label
            title="路径"
            text={`${block.notebook_name || "未知笔记本"}${block.hpath || "未知路径"}`}
          />
          <Detail.Metadata.Label
            title="创建时间"
            text={formatSiYuanTime(block.created)}
          />
          <Detail.Metadata.Label
            title="更新时间"
            text={formatSiYuanTime(block.updated)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="字符数"
            text={`${block.length || documentContent.length} 字符`}
          />
          <Detail.Metadata.Label
            title="类型"
            text={block.type === "d" ? "文档" : "块"}
          />
          {block.tag && (
            <Detail.Metadata.TagList title="标签">
              <Detail.Metadata.TagList.Item text={block.tag} />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="在思源笔记中打开"
            url={siyuanAPI.getDocUrl(block.id)}
          />

          {/* 添加文件打开动作 */}
          {filePaths.length > 0 && (
            <ActionPanel.Section title="打开文件">
              {filePaths
                .map((file, index) => {
                  const localPath = siyuanAPI.getLocalFilePath(file.path);

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
            <Action.CopyToClipboard
              title="复制文档内容"
              content={documentContent || block.markdown || block.content || ""}
            />
            <Action.CopyToClipboard title="复制文档id" content={block.id} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function RecentNotes() {
  const [recentNotes, setRecentNotes] = useState<SiYuanBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRecentNotes();
  }, []);

  const loadRecentNotes = async () => {
    try {
      const notes = await siyuanAPI.getRecentDocs();
      setRecentNotes(notes);
    } catch (error) {
      console.error("获取最近文档失败:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "获取最近文档失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (content: string) => {
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

  const refreshList = () => {
    setLoading(true);
    loadRecentNotes();
  };

  const getTimeAgo = (timestamp: string) => {
    try {
      const noteTime = parseSiYuanTime(timestamp);
      if (!noteTime) return "无效时间";

      const now = new Date();
      const diffMs = now.getTime() - noteTime.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "刚刚";
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;

      return noteTime.toLocaleDateString("zh-CN");
    } catch (error) {
      return "无效时间";
    }
  };

  const getAccessories = (note: SiYuanBlock) => {
    const accessories = [];

    // 添加最后访问时间
    accessories.push({
      text: getTimeAgo(note.updated),
      tooltip: `最后更新: ${formatSiYuanTime(note.updated)}`,
    });

    return accessories;
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="搜索最近访问的笔记..."
      actions={
        <ActionPanel>
          <Action
            title="刷新列表"
            icon={Icon.ArrowClockwise}
            onAction={refreshList}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {recentNotes.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="暂无最近访问的笔记"
          description="在思源中打开文档后，会在这里显示"
          actions={
            <ActionPanel>
              <Action
                title="刷新列表"
                icon={Icon.ArrowClockwise}
                onAction={refreshList}
              />
            </ActionPanel>
          }
        />
      ) : (
        recentNotes.map((note, index) => (
          <List.Item
            key={note.id}
            icon={{
              source: Icon.Document,
              tintColor: index < 3 ? Color.Blue : Color.SecondaryText,
            }}
            title={note.name || note.content.substring(0, 50)}
            subtitle={`${note.notebook_name || "未知笔记本"} · ${note.hpath || note.path || "未知路径"}`}
            accessories={getAccessories(note)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="查看详情"
                  icon={Icon.Eye}
                  target={<NoteDetail block={note} />}
                />
                <Action
                  title="复制内容"
                  icon={Icon.Clipboard}
                  onAction={() => copyLink(note.markdown || note.content)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="复制链接"
                  icon={Icon.Link}
                  onAction={() => copyLink(`siyuan://blocks/${note.id}`)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.OpenInBrowser
                  url={siyuanAPI.getDocUrl(note.rootID || note.id)}
                  title="在思源笔记中打开"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="刷新列表"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshList}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

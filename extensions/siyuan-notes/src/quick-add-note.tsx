import { useState, useEffect, useRef, useCallback } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  showHUD,
  closeMainWindow,
  PopToRootType,
  Icon,
  LaunchProps,
  List,
  Detail,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { pasteFromClipboard } from "./utils/clipboard";
import { siyuanAPI } from "./api/siyuan";
import { SiYuanBlock } from "./types";

interface FormValues {
  content: string;
  addTimestamp: boolean;
}

interface Arguments {
  content?: string;
}

// 文档选择组件
function DocumentSelector({ onSelect }: { onSelect: (docId: string) => void }) {
  const [recentNotes, setRecentNotes] = useState<SiYuanBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState("");

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

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      loadRecentNotes();
      return;
    }

    try {
      setLoading(true);
      const searchResults = await siyuanAPI.searchNotes(query);
      // 只显示文档类型的结果
      const docs = searchResults.blocks.filter((block) => block.isDocument);
      setRecentNotes(docs);
    } catch (error) {
      console.error("搜索文档失败:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "搜索失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string): string => {
    if (!timestamp || timestamp.length !== 14) return "无效时间";

    try {
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const hour = timestamp.substring(8, 10);
      const minute = timestamp.substring(10, 12);

      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "刚刚";
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      return date.toLocaleDateString("zh-CN");
    } catch (error) {
      return "无效时间";
    }
  };

  return (
    <List
      isLoading={loading}
      onSearchTextChange={handleSearch}
      searchText={searchText}
      searchBarPlaceholder="搜索文档或查看最近修改的文档..."
      navigationTitle="选择目标文档"
    >
      <List.Section title="文档列表">
        {recentNotes.map((note, index) => (
          <List.Item
            key={note.id}
            icon={{
              source: Icon.Document,
              tintColor: index < 3 ? "#007AFF" : "#8E8E93",
            }}
            title={note.content || "无标题"}
            subtitle={`${note.notebook_name || "未知笔记本"} • ${note.hpath || "未知路径"}`}
            accessories={[
              {
                text: formatDate(note.updated),
                tooltip: `最后更新: ${formatDate(note.updated)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="选择此文档"
                  icon={Icon.Check}
                  onAction={() => onSelect(note.id)}
                />
                <Action.OpenInBrowser
                  title="在思源笔记中打开"
                  url={siyuanAPI.getDocUrl(note.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {recentNotes.length === 0 && !loading && (
        <List.EmptyView
          icon={Icon.Document}
          title="未找到文档"
          description={
            searchText ? "尝试使用不同的关键词搜索" : "暂无最近访问的文档"
          }
        />
      )}
    </List>
  );
}

export default function QuickAddNote(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { content: initialContent } = props.arguments;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");
  const [targetDocument, setTargetDocument] = useState<string>("");
  const [targetDocTitle, setTargetDocTitle] = useState<string>("");
  const [showDocumentSelector, setShowDocumentSelector] =
    useState<boolean>(false);

  // 使用 localStorage 保持时间戳设置，默认为 false
  const { value: addTimestamp, setValue: setAddTimestamp } = useLocalStorage(
    "quick-add-timestamp",
    false,
  );

  // 使用ref防止React Strict Mode下的重复执行
  const hasExecutedRef = useRef<boolean>(false);
  const hasLoadedClipboardRef = useRef<boolean>(false);
  const hasAutoSelectedDocRef = useRef<boolean>(false);

  // 检查是否为快速添加模式（有内容参数时自动添加到最近文档）
  const isQuickMode = Boolean(initialContent && initialContent.trim());

  // 自动加载剪贴板内容
  const loadClipboardContent = useCallback(async () => {
    if (hasLoadedClipboardRef.current) return;
    hasLoadedClipboardRef.current = true;

    try {
      const clipboardText = await pasteFromClipboard();
      if (clipboardText && clipboardText.trim()) {
        setContent(clipboardText);
      }
    } catch (error) {
      console.error("读取剪贴板失败:", error);
    }
  }, []);

  // 获取文档标题
  const getDocumentTitle = useCallback(async (docId: string) => {
    try {
      const blockInfo = await siyuanAPI.getBlockInfo(docId);
      return blockInfo.content || "未知文档";
    } catch (error) {
      console.error("获取文档信息失败:", error);
      return "未知文档";
    }
  }, []);

  // 选择最近编辑的文档并直接添加内容
  const handleSelectRecentDocument = useCallback(async () => {
    try {
      // 检查是否有内容要添加
      const contentToAdd = content.trim();
      if (!contentToAdd) {
        await showToast({
          style: Toast.Style.Failure,
          title: "请输入要添加的内容",
        });
        return;
      }

      const mostRecentDocId = await siyuanAPI.getMostRecentDocumentId();
      if (mostRecentDocId) {
        const title = await getDocumentTitle(mostRecentDocId);

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "正在添加到最近编辑的文档...",
          message: title,
        });

        // 直接添加内容到最近的文档
        await siyuanAPI.addToDocument(
          mostRecentDocId,
          contentToAdd,
          addTimestamp || false,
        );

        toast.style = Toast.Style.Success;
        toast.title = "✅ 已添加到最近编辑的文档";
        toast.message = title;

        // 关闭主窗口
        await closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "未找到最近的文档",
        });
      }
    } catch (error) {
      console.error("获取最近文档失败:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "添加失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  }, [getDocumentTitle, content, addTimestamp]);

  // 快速添加功能 - 自动选择最近文档
  const handleQuickAdd = useCallback(
    async (content: string) => {
      try {
        // 获取最近编辑的文档
        const mostRecentDocId = await siyuanAPI.getMostRecentDocumentId();
        if (!mostRecentDocId) {
          await showHUD("❌ 未找到最近的文档");
          await closeMainWindow({
            clearRootSearch: true,
            popToRootType: PopToRootType.Immediate,
          });
          return;
        }

        await siyuanAPI.addToDocument(
          mostRecentDocId,
          content,
          addTimestamp || false,
        ); // 使用用户设置的时间戳选项

        await closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });

        await showHUD("✅ 已添加到最近编辑的文档");
      } catch (error) {
        await closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });

        await showHUD(
          `❌ 添加失败: ${error instanceof Error ? error.message : "未知错误"}`,
        );
      }
    },
    [addTimestamp],
  );

  // 如果是快速模式，立即执行添加操作
  useEffect(() => {
    if (isQuickMode && !hasExecutedRef.current) {
      hasExecutedRef.current = true;
      handleQuickAdd(initialContent!);
    }
  }, [isQuickMode, initialContent, handleQuickAdd]);

  // 初始化时加载剪贴板内容
  useEffect(() => {
    if (!isQuickMode && !initialContent) {
      loadClipboardContent();
    } else if (initialContent) {
      setContent(initialContent);
    }
  }, [isQuickMode, initialContent, loadClipboardContent]);

  const handleDocumentSelect = async (docId: string) => {
    try {
      const title = await getDocumentTitle(docId);

      // 检查是否有内容要添加
      const contentToAdd = content.trim();
      if (!contentToAdd) {
        await showToast({
          style: Toast.Style.Failure,
          title: "请输入要添加的内容",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "正在添加到文档...",
        message: title,
      });

      // 直接添加内容到选中的文档
      await siyuanAPI.addToDocument(docId, contentToAdd, addTimestamp || false);

      toast.style = Toast.Style.Success;
      toast.title = "✅ 已添加到文档";
      toast.message = title;

      // 关闭主窗口
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      console.error("选择文档失败:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "添加失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  // 如果是快速模式，返回null避免UI闪现
  if (isQuickMode) {
    return null;
  }

  // 如果正在显示文档选择器
  if (showDocumentSelector) {
    return <DocumentSelector onSelect={handleDocumentSelect} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="选择目标文档"
              icon={Icon.List}
              onAction={() => setShowDocumentSelector(true)}
            />
            <Action
              title="使用最近编辑的文档"
              icon={Icon.Clock}
              onAction={handleSelectRecentDocument}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="快速添加"
        text="将内容快速添加到指定的思源笔记文档中"
      />

      <Form.TextArea
        id="content"
        title="内容"
        placeholder="输入要添加的内容...支持 Markdown 格式"
        value={content}
        onChange={setContent}
        enableMarkdown
        autoFocus
      />

      <Form.Checkbox
        id="addTimestamp"
        title="选项"
        label="添加时间戳"
        value={addTimestamp || false}
        onChange={async (value) => {
          await setAddTimestamp(value);
        }}
      />

      <Form.Separator />

      <Form.Description
        title="使用说明"
        text="• 内容会自动从剪贴板读取
• 使用 Cmd+Enter 选择要添加到的文档
• 使用 Cmd+R 快速选择最近编辑的文档
• 支持 Markdown 格式
• 支持粘贴到当前应用"
      />
    </Form>
  );
}

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
} from "@raycast/api";
import { siyuanAPI } from "./api/siyuan";

interface FormValues {
  content: string;
  addTimestamp: boolean;
}

interface Arguments {
  content?: string;
  quickAdd?: string;
}

export default function AddToDailyNote(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { content: initialContent } = props.arguments;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");

  // 使用ref防止React Strict Mode下的重复执行
  const hasExecutedRef = useRef<boolean>(false);

  // 用于重置表单字段的ref
  const textAreaRef = useRef<Form.TextArea>(null);
  const checkboxRef = useRef<Form.Checkbox>(null);

  // 检查是否为快速添加模式 - 当有content参数传入时
  const isQuickMode = Boolean(initialContent && initialContent.trim());

  const handleQuickAdd = useCallback(async (content: string) => {
    if (!content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "内容不能为空",
      });
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }

    try {
      await siyuanAPI.addToDailyNote(content, true); // 默认添加时间戳

      // 关闭窗口并清除状态返回根视图
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });

      // 使用HUD显示成功消息，因为窗口已关闭
      await showHUD("✅ 已添加到每日笔记");
    } catch (error) {
      // 出错时关闭窗口
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });

      // 使用HUD显示错误消息
      await showHUD(
        `❌ 添加失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }, []); // useCallback确保函数引用稳定

  // 如果是快速模式，立即执行添加操作（防止重复执行）
  useEffect(() => {
    if (isQuickMode && !hasExecutedRef.current) {
      hasExecutedRef.current = true;
      handleQuickAdd(initialContent!);
    }
  }, [isQuickMode, initialContent, handleQuickAdd]);

  const handleSubmit = async (values: FormValues) => {
    const contentToSubmit = content.trim();
    if (!contentToSubmit) {
      await showToast({
        style: Toast.Style.Failure,
        title: "请输入要添加的内容",
      });
      return;
    }

    setIsLoading(true);

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "正在添加到每日笔记...",
      });

      // 使用state中的content和表单中的时间戳选项
      await siyuanAPI.addToDailyNote(contentToSubmit, values.addTimestamp);

      toast.style = Toast.Style.Success;
      toast.title = "✅ 已添加到每日笔记";
      toast.message =
        contentToSubmit.length > 50
          ? contentToSubmit.substring(0, 50) + "..."
          : contentToSubmit;

      // 重置表单状态
      setContent("");

      // 使用 Raycast 表单字段的 reset 方法
      textAreaRef.current?.reset();
      checkboxRef.current?.reset();

      // 关闭主窗口并清除状态返回根视图
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "添加失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { title: "💡 想法", prefix: "💡 ", placeholder: "记录一个灵感或想法..." },
    { title: "📝 待办", prefix: "- [ ] ", placeholder: "添加一个新的任务..." },
    { title: "🔗 链接", prefix: "🔗 ", placeholder: "保存有用的链接..." },
    { title: "📚 学习", prefix: "📚 ", placeholder: "学习笔记或心得..." },
    { title: "💼 工作", prefix: "💼 ", placeholder: "工作相关的记录..." },
    { title: "🎉 成就", prefix: "🎉 ", placeholder: "分享一个成就或里程碑..." },
    { title: "🚀 目标", prefix: "🚀 ", placeholder: "设定一个新目标..." },
    { title: "📊 总结", prefix: "📊 ", placeholder: "总结今天的收获..." },
  ];

  // 应用快速模板的函数
  const applyTemplate = (action: (typeof quickActions)[0]) => {
    // 如果当前内容为空或者是其他模板内容，直接替换
    // 如果有用户输入的内容，则将模板内容添加到末尾
    const currentContent = content.trim();
    let newContent: string;

    if (
      !currentContent ||
      quickActions.some((qa) => currentContent.startsWith(qa.prefix))
    ) {
      // 直接替换模板
      newContent = action.prefix + action.placeholder;
    } else {
      // 在现有内容后添加新模板
      newContent = currentContent + "\n" + action.prefix + action.placeholder;
    }

    setContent(newContent);
  };

  // 如果是快速模式，返回null以避免任何UI闪现
  // 快速添加操作会在useEffect中执行并关闭窗口
  if (isQuickMode) {
    return null;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              icon={Icon.Plus}
              title="添加到每日笔记"
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="快速模板">
            {quickActions.map((action) => (
              <Action
                key={action.title}
                title={action.title}
                icon={Icon.Text}
                onAction={() => applyTemplate(action)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="每日笔记"
        text={`将内容快速添加到今天的每日笔记中 (${new Date().toLocaleDateString("zh-CN")})`}
      />

      <Form.TextArea
        ref={textAreaRef}
        id="content"
        title="内容"
        placeholder="输入要添加到每日笔记的内容...支持 Markdown 格式"
        value={content}
        onChange={setContent}
        enableMarkdown
        autoFocus
      />

      <Form.Checkbox
        ref={checkboxRef}
        id="addTimestamp"
        title="选项"
        label="添加时间戳"
        defaultValue={true}
      />

      <Form.Separator />

      <Form.Description
        title="提示"
        text="支持 Markdown 格式。如果今日笔记不存在，会自动创建。"
      />
    </Form>
  );
}

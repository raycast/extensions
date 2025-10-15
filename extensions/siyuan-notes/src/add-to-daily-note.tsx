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
        title: "Content Cannot Be Empty",
      });
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
      return;
    }

    try {
      await siyuanAPI.addToDailyNote(content, true); // Add timestamp by default

      // Close window and return to root view
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });

      // Show success message via HUD as window is closed
      await showHUD("✅ Added to Daily Note");
    } catch (error) {
      // Close window on error
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });

      // Show error message via HUD
      await showHUD(
        `❌ Add Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, []); // useCallback ensures stable function reference

  // If in quick mode, execute add operation immediately (prevent duplicate execution)
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
        title: "Please Enter Content to Add",
      });
      return;
    }

    setIsLoading(true);

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Adding to Daily Note...",
      });

      // Use content from state and timestamp option from form
      await siyuanAPI.addToDailyNote(contentToSubmit, values.addTimestamp);

      toast.style = Toast.Style.Success;
      toast.title = "✅ Added to Daily Note";
      toast.message =
        contentToSubmit.length > 50
          ? contentToSubmit.substring(0, 50) + "..."
          : contentToSubmit;

      // Reset form state
      setContent("");

      // Use Raycast form field reset method
      textAreaRef.current?.reset();
      checkboxRef.current?.reset();

      // Close main window and return to root view
      await closeMainWindow({
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Add Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      title: "💡 Idea",
      prefix: "💡 ",
      placeholder: "Record an inspiration or idea...",
    },
    { title: "📝 Task", prefix: "- [ ] ", placeholder: "Add a new task..." },
    { title: "🔗 Link", prefix: "🔗 ", placeholder: "Save a useful link..." },
    {
      title: "📚 Learning",
      prefix: "📚 ",
      placeholder: "Learning notes or insights...",
    },
    { title: "💼 Work", prefix: "💼 ", placeholder: "Work-related records..." },
    {
      title: "🎉 Achievement",
      prefix: "🎉 ",
      placeholder: "Share an achievement or milestone...",
    },
    { title: "🚀 Goal", prefix: "🚀 ", placeholder: "Set a new goal..." },
    {
      title: "📊 Summary",
      prefix: "📊 ",
      placeholder: "Summarize today's gains...",
    },
  ];

  // Apply quick template function
  const applyTemplate = (action: (typeof quickActions)[0]) => {
    // If current content is empty or is another template content, replace directly
    // If there is user input content, add template content to the end
    const currentContent = content.trim();
    let newContent: string;

    if (
      !currentContent ||
      quickActions.some((qa) => currentContent.startsWith(qa.prefix))
    ) {
      // Replace template directly
      newContent = action.prefix + action.placeholder;
    } else {
      // Add new template after existing content
      newContent = currentContent + "\n" + action.prefix + action.placeholder;
    }

    setContent(newContent);
  };

  // If in quick mode, return null to avoid UI flashing
  // Quick add operation will execute in useEffect and close window
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
              title="Add to Daily Note"
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Templates">
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
        title="Daily Note"
        text={`Quickly add content to today's daily note (${new Date().toLocaleDateString("en-US")})`}
      />

      <Form.TextArea
        ref={textAreaRef}
        id="content"
        title="Content"
        placeholder="Enter content to add to daily note... Supports Markdown format"
        value={content}
        onChange={setContent}
        enableMarkdown
        autoFocus
      />

      <Form.Checkbox
        ref={checkboxRef}
        id="addTimestamp"
        title="Options"
        label="Add Timestamp"
        defaultValue={true}
      />

      <Form.Separator />

      <Form.Description
        title="Tips"
        text="Supports Markdown format. Daily note will be auto-created if it doesn't exist."
      />
    </Form>
  );
}

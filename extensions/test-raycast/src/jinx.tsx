import React from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
  LocalStorage,
  Color,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";

// ==================== 类型定义 ====================
interface Todo {
  id: string;
  title: string;
  createdAt: number;
}

// ==================== 常量 ====================
const STORAGE_KEY = "todos";

const DEFAULT_TODOS: Todo[] = [
  { id: "1", title: "写周报", createdAt: Date.now() - 2000 },
  { id: "2", title: "Review PR", createdAt: Date.now() - 1000 },
  { id: "3", title: "喝一杯咖啡", createdAt: Date.now() },
];

// ==================== 工具函数 ====================
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return "刚刚";
}

async function showSuccessToast(title: string, message?: string) {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

async function showErrorToast(title: string, message?: string) {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
}

// ==================== 主组件 ====================
export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  // 加载待办事项
  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = useCallback(async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        const parsedTodos: Todo[] = JSON.parse(stored);
        // 按创建时间降序排序（最新的在前）
        setTodos(parsedTodos.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        // 初始化默认待办事项
        setTodos(DEFAULT_TODOS);
        await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TODOS));
      }
    } catch (error) {
      await showErrorToast("加载失败", error instanceof Error ? error.message : "未知错误");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveTodos = useCallback(async (newTodos: Todo[]) => {
    try {
      // 按创建时间降序排序
      const sortedTodos = [...newTodos].sort((a, b) => b.createdAt - a.createdAt);
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(sortedTodos));
      setTodos(sortedTodos);
    } catch (error) {
      await showErrorToast("保存失败", error instanceof Error ? error.message : "未知错误");
    }
  }, []);

  const handleComplete = useCallback(
    async (todo: Todo) => {
      const newTodos = todos.filter((t) => t.id !== todo.id);
      await saveTodos(newTodos);
      await showSuccessToast("已完成", `${todo.title}`);
    },
    [todos, saveTodos],
  );

  const handleDelete = useCallback(
    async (todo: Todo) => {
      const newTodos = todos.filter((t) => t.id !== todo.id);
      await saveTodos(newTodos);
      await showSuccessToast("已删除", `${todo.title}`);
    },
    [todos, saveTodos],
  );

  const handleAdd = useCallback(
    async (title: string) => {
      const newTodo: Todo = {
        id: Date.now().toString(),
        title: title.trim(),
        createdAt: Date.now(),
      };
      const newTodos = [newTodo, ...todos];
      await saveTodos(newTodos);
      await showSuccessToast("已添加", newTodo.title);
    },
    [todos, saveTodos],
  );

  const handleClearAll = useCallback(async () => {
    await saveTodos([]);
    await showSuccessToast("已清空", "所有待办事项已清空");
  }, [saveTodos]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="搜索待办事项…">
      {todos.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="没有待办事项"
          description="按 ⌘N 添加新的待办事项"
          actions={
            <ActionPanel>
              <Action
                title="添加待办事项"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<AddTodoForm onAdd={handleAdd} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        todos.map((todo) => (
          <List.Item
            key={todo.id}
            id={todo.id}
            title={todo.title}
            icon={{ source: Icon.Circle, tintColor: Color.Blue }}
            accessories={[{ text: formatRelativeTime(todo.createdAt) }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="操作">
                  <Action
                    title="完成"
                    icon={Icon.Checkmark}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    onAction={() => handleComplete(todo)}
                  />
                  <Action
                    title="添加待办事项"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<AddTodoForm onAdd={handleAdd} />)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="复制标题"
                    content={todo.title}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="危险操作">
                  <Action
                    title="删除"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => handleDelete(todo)}
                  />
                  {todos.length > 1 && (
                    <Action
                      title="清空所有"
                      icon={Icon.ExclamationMark}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      onAction={handleClearAll}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// ==================== 表单组件 ====================
interface AddTodoFormProps {
  onAdd: (title: string) => Promise<void>;
}

function AddTodoForm({ onAdd }: AddTodoFormProps) {
  const { pop } = useNavigation();
  const [titleError, setTitleError] = useState<string>();

  const handleSubmit = useCallback(
    async (values: { title: string }) => {
      const trimmedTitle = values.title?.trim();

      if (!trimmedTitle) {
        setTitleError("请输入待办事项标题");
        return;
      }

      if (trimmedTitle.length > 100) {
        setTitleError("标题不能超过 100 个字符");
        return;
      }

      await onAdd(trimmedTitle);
      pop();
    },
    [onAdd, pop],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="添加" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="待办事项"
        placeholder="输入待办事项标题..."
        error={titleError}
        onChange={() => setTitleError(undefined)}
        autoFocus
      />
      <Form.Description text="提示：按 Enter 提交，按 Esc 取消" />
    </Form>
  );
}

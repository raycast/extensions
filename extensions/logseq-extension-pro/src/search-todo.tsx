import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { Todo, TodoStatus, Priority, Preferences } from "./types";
export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchContent, setSearchContent] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<TodoStatus | "">("");
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadTodos();
  }, []);

  const filteredTodos = useMemo(() => {
    const searchLower = searchContent.toLowerCase();
    const searchTerms = searchLower.split(/\s+/).filter((term) => term);

    return todos.filter((todo) => {
      if (selectedStatus && todo.status !== selectedStatus) return false;

      if (searchTerms.length === 0) return true;

      for (const term of searchTerms) {
        if (["a", "b", "c"].includes(term)) {
          if (todo.priority.toLowerCase() !== term) return false;
          continue;
        }

        if (todo.content.toLowerCase().includes(term) || todo.page.toLowerCase().includes(term)) {
          continue;
        }
        return false;
      }
      return true;
    });
  }, [searchContent, selectedStatus, todos]);

  async function updateTodo(todo: Todo, newStatus: TodoStatus, newPriority: Priority) {
    try {
      const filePath = join(preferences.logseqPath, "pages", `${todo.page}.md`);
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const todoMatch = line.match(/^- (TODO|NOW|WAITING|LATER|DOING|DONE|CANCELED) \[#([ABC])\] (.+)$/);
        if (todoMatch && todoMatch[3] === todo.content) {
          lines[index] = `- ${newStatus} [#${newPriority}] ${todo.content}`;
        }
      });

      await writeFile(filePath, lines.join("\n"));
      await loadTodos();
      await showToast(Toast.Style.Success, "更新成功");
    } catch (error) {
      await showToast(Toast.Style.Failure, "更新失败");
    }
  }

  const loadTodos = useCallback(async () => {
    try {
      const pagesDir = join(preferences.logseqPath, "pages");
      const files = await readdir(pagesDir);
      const mdFiles = files.filter((file) => file.endsWith(".md"));

      const allTodos: Todo[] = [];

      for (const file of mdFiles) {
        const content = await readFile(join(pagesDir, file), "utf-8");
        const lines = content.split("\n");
        const pageName = file.replace(".md", "");

        lines.forEach((line) => {
          const todoMatch = line.match(
            /^- (TODO|NOW|WAITING|LATER|DOING|DONE|CANCELED) \[#([ABC])\] ([^\n]+?)(?:\s+(?:#[^\s]+\s*)*)?(?:\s+📅\s*(\d{4}-\d{2}-\d{2}))?$/,
          );
          if (todoMatch) {
            const content = todoMatch[3];
            const tagsMatch = content.match(/#[^\s]+/g) || [];
            const tags = tagsMatch.map((tag) => tag.slice(1));
            const dueDate = todoMatch[4] || "";

            allTodos.push({
              content: content.replace(/#[^\s]+/g, "").trim(),
              page: pageName,
              completed: false,
              status: todoMatch[1] as TodoStatus,
              priority: todoMatch[2] as Priority,
              tags,
              dueDate,
            });
          }
        });
      }

      setTodos(allTodos);
      setIsLoading(false);
    } catch (error) {
      await showToast(Toast.Style.Failure, "搜索失败");
      return [];
    }
  }, [preferences]);

  const handleSearchChange = useCallback((text: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchContent(text);
    }, 100);
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜索内容或页面名称 (输入a/b/c过滤优先级)"
      searchText={searchContent}
      onSearchTextChange={handleSearchChange}
      searchBarAccessory={
        <List.Dropdown tooltip="选择状态" value={selectedStatus} onChange={setSelectedStatus}>
          <List.Dropdown.Item title="全部状态" value="" />
          <List.Dropdown.Item title="TODO" value="TODO" />
          <List.Dropdown.Item title="NOW" value="NOW" />
          <List.Dropdown.Item title="WAITING" value="WAITING" />
          <List.Dropdown.Item title="LATER" value="LATER" />
          <List.Dropdown.Item title="DOING" value="DOING" />
          <List.Dropdown.Item title="DONE" value="DONE" />
          <List.Dropdown.Item title="CANCELED" value="CANCELED" />
        </List.Dropdown>
      }
    >
      {filteredTodos.map((todo, index) => (
        <List.Item
          key={index}
          title={todo.content}
          subtitle={todo.page}
          accessories={[
            {
              icon:
                todo.status === "DONE"
                  ? Icon.CheckCircle
                  : todo.status === "CANCELED"
                    ? Icon.XMarkCircle
                    : todo.status === "DOING"
                      ? Icon.Clock
                      : todo.status === "NOW"
                        ? Icon.Star
                        : todo.status === "WAITING"
                          ? Icon.BellDot
                          : todo.status === "LATER"
                            ? Icon.Calendar
                            : todo.status === "NOW"
                              ? Icon.Star
                              : todo.status === "WAITING"
                                ? Icon.BellDot
                                : todo.status === "LATER"
                                  ? Icon.Calendar
                                  : Icon.Circle,
              text: todo.status,
              tooltip: todo.status,
            },
            {
              icon: todo.priority === "A" ? Icon.ExclamationMark : todo.priority === "B" ? Icon.Minus : Icon.ArrowDown,
              text: `${todo.priority}级`,
              tooltip: `${todo.priority}级优先级`,
            },
            ...(todo.dueDate
              ? [
                  {
                    icon: Icon.Calendar,
                    text: todo.dueDate,
                    tooltip: "截止日期",
                  },
                ]
              : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Submenu title="修改状态">
                <Action title="Todo" onAction={() => updateTodo(todo, "TODO", todo.priority)} />
                <Action title="Now" onAction={() => updateTodo(todo, "NOW", todo.priority)} />
                <Action title="Waiting" onAction={() => updateTodo(todo, "WAITING", todo.priority)} />
                <Action title="Later" onAction={() => updateTodo(todo, "LATER", todo.priority)} />
                <Action title="Doing" onAction={() => updateTodo(todo, "DOING", todo.priority)} />
                <Action title="Done" onAction={() => updateTodo(todo, "DONE", todo.priority)} />
                <Action title="Canceled" onAction={() => updateTodo(todo, "CANCELED", todo.priority)} />
              </ActionPanel.Submenu>
              <ActionPanel.Submenu title="修改优先级">
                <Action title="高优先级 (a)" onAction={() => updateTodo(todo, todo.status, "A")} />
                <Action title="中优先级 (b)" onAction={() => updateTodo(todo, todo.status, "B")} />
                <Action title="低优先级 (c)" onAction={() => updateTodo(todo, todo.status, "C")} />
              </ActionPanel.Submenu>
              <Action
                title="删除todo"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  try {
                    const filePath = join(preferences.logseqPath, "pages", `${todo.page}.md`);
                    const content = await readFile(filePath, "utf-8");
                    const lines = content.split("\n");
                    const newLines = lines.filter((line) => !line.includes(todo.content));
                    await writeFile(filePath, newLines.join("\n"));
                    await loadTodos();
                    await showToast(Toast.Style.Success, "Todo已删除");
                  } catch (error) {
                    console.error(error);
                    await showToast(Toast.Style.Failure, "删除Todo失败");
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

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

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const todoMatch = line.match(
          /^- (TODO|NOW|WAITING|LATER|DOING|DONE|CANCELED) \[#([ABC])\] ([^\n]+?)(?:\s+(?:#[^\s]+\s*)*)?(?:\s+📅\s*[^\n]+)?$/,
        );
        if (todoMatch) {
          const currentContent = todoMatch[3];
          const currentContentWithoutTags = currentContent.replace(/#[^\s]+/g, "").trim();
          const todoContentWithoutPriority = todo.content.replace(/\s*\[#[ABC]\]\s*/g, "").trim();
          const todoContentWithoutDeadline = todoContentWithoutPriority.replace(/📅.*$/, "").trim();

          if (
            currentContentWithoutTags === todoContentWithoutPriority ||
            todoContentWithoutDeadline === currentContentWithoutTags
          ) {
            const tagsMatch = line.match(/ #[^\s\]]+/g) || [];
            const dateMatch = line.match(/📅\s*([^\n]+)/);
            const tags = tagsMatch.length > 0 ? ` ${tagsMatch.join(" ")}` : "";
            const date = dateMatch ? ` 📅 ${dateMatch[1]}` : "";
            const deadlineMatch = lines[i + 1] && lines[i + 1].trim().match(/^DEADLINE:\s*<([^>]+)>/);
            const deadline = deadlineMatch ? `\nDEADLINE: <${deadlineMatch[1]}>` : "";
            const cleanContent = currentContentWithoutTags;
            const updatedLine = `- ${newStatus} [#${newPriority}] ${cleanContent}${tags}${date}${deadline}`;
            lines[i] = updatedLine;
            await showToast({
              style: Toast.Style.Success,
              title: "Content to be updated",
              message: `"${updatedLine.trim()}"`,
            });
          }
        }
      }

      await writeFile(filePath, lines.join("\n"));
      await loadTodos();
      await showToast(Toast.Style.Success, "Update successful");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Update failed");
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
      await showToast(Toast.Style.Failure, "Search failed");
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
      searchBarPlaceholder="Search content or page name (type a/b/c to filter priority)"
      searchText={searchContent}
      onSearchTextChange={handleSearchChange}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Status" value={selectedStatus} onChange={setSelectedStatus}>
          <List.Dropdown.Item title="All Status" value="" />
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
                          ? Icon.Mask
                          : todo.status === "LATER"
                            ? Icon.Calendar
                            : Icon.Circle,
              text: todo.status,
              tooltip: todo.status,
            },

            {
              icon: todo.priority === "A" ? Icon.ExclamationMark : todo.priority === "B" ? Icon.Minus : Icon.ArrowDown,
              text: `Priority ${todo.priority}`,
              tooltip: `Priority Level ${todo.priority}`,
            },
            ...(todo.dueDate
              ? [
                  {
                    icon: Icon.Calendar,
                    text: todo.dueDate,
                    tooltip: "Due Date",
                  },
                ]
              : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Submenu title="Change Status">
                <Action title="Todo" onAction={() => updateTodo(todo, "TODO", todo.priority)} />
                <Action title="Now" onAction={() => updateTodo(todo, "NOW", todo.priority)} />
                <Action title="Waiting" onAction={() => updateTodo(todo, "WAITING", todo.priority)} />
                <Action title="Later" onAction={() => updateTodo(todo, "LATER", todo.priority)} />
                <Action title="Doing" onAction={() => updateTodo(todo, "DOING", todo.priority)} />
                <Action title="Done" onAction={() => updateTodo(todo, "DONE", todo.priority)} />
                <Action title="Canceled" onAction={() => updateTodo(todo, "CANCELED", todo.priority)} />
              </ActionPanel.Submenu>
              <ActionPanel.Submenu title="Change Priority">
                <Action title="High - Priority (a)" onAction={() => updateTodo(todo, todo.status, "A")} />
                <Action title="Medium Priority (b)" onAction={() => updateTodo(todo, todo.status, "B")} />
                <Action title="Low Priority (c)" onAction={() => updateTodo(todo, todo.status, "C")} />
              </ActionPanel.Submenu>
              <Action
                title="Delete Todo"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  try {
                    const filePath = join(preferences.logseqPath, "pages", `${todo.page}.md`);
                    const content = await readFile(filePath, "utf-8");
                    const lines = content.split("\n");
                    let skipNext = false;
                    const newLines = lines.filter((line, index) => {
                      if (skipNext) {
                        skipNext = false;
                        return false;
                      }
                      const todoMatch = line.match(
                        /^- (TODO|NOW|WAITING|LATER|DOING|DONE|CANCELED) \[#([ABC])\] ([^\n]+?)(?:\s+(?:#[^\s]+\s*)*)?(?:\s+📅\s*[^\n]+)?$/,
                      );
                      if (!todoMatch) return true;
                      const currentContentWithoutTags = todo.content.replace(/#[^\s]+/g, "").trim();
                      const todoContentWithoutPriority = currentContentWithoutTags
                        .replace(/\s*\[#[ABC]\]\s*/g, "")
                        .trim();
                      const todoContentWithoutDeadline = todoContentWithoutPriority.replace(/📅.*$/, "").trim();
                      const todoContent = todoMatch[3].replace(/#[^\s]+/g, "").trim();
                      console.log(todoContent, todoContentWithoutDeadline);
                      if (todoContent === todoContentWithoutDeadline) {
                        if (
                          lines[index + 1] &&
                          lines[index + 1].trim().startsWith("  DEADLINE:") &&
                          lines[index + 1].trim().startsWith("  SCHEDULED:")
                        ) {
                          skipNext = true;
                        }
                        return false;
                      }
                      return true;
                    });
                    const finalContent = newLines.join("\n");
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Content to be deleted",
                      message: `"${todo.content}"`,
                    });
                    await writeFile(filePath, finalContent);
                    await loadTodos();
                    await showToast(Toast.Style.Success, "Todo deleted successfully");
                  } catch (error) {
                    await showToast(Toast.Style.Failure, "Failed to delete Todo");
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

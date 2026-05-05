import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  addTodo,
  buildObsidianOpenUrl,
  deleteTodo,
  loadTodoNote,
  resolveTodoNotePath,
  setTodoCompleted,
  TodoItem,
  TodoNote,
  updateTodoText,
} from "./lib/todo-note";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const resolvedNotePath = resolveTodoNotePath(preferences);
  const [note, setNote] = useState<TodoNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);

    try {
      const loadedNote = await loadTodoNote(preferences);
      setNote(loadedNote);
      setError(null);
    } catch (exception) {
      setError(getErrorMessage(exception));
      setNote(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [preferences.createNoteIfMissing, preferences.newTodoPlacement, preferences.todoNotePath, preferences.vaultPath]);

  async function handleCreate(text: string) {
    await runMutation("Creating todo", async () => {
      await addTodo(preferences, text);
    });
  }

  async function handleToggle(todo: TodoItem) {
    const actionTitle = todo.completed ? "Reopening todo" : "Completing todo";

    await runMutation(actionTitle, async () => {
      await setTodoCompleted(preferences, todo, !todo.completed);
    });
  }

  async function handleEdit(todo: TodoItem, text: string) {
    await runMutation("Updating todo", async () => {
      await updateTodoText(preferences, todo, text);
    });
  }

  async function handleDelete(todo: TodoItem) {
    const confirmed = await confirmAlert({
      title: "Delete this todo?",
      message: todo.text,
      primaryAction: { title: "Delete Todo" },
    });

    if (!confirmed) {
      return;
    }

    await runMutation("Deleting todo", async () => {
      await deleteTodo(preferences, todo);
    });
  }

  async function handleOpenNote() {
    try {
      await open(buildObsidianOpenUrl(resolvedNotePath));
    } catch (exception) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open the note in Obsidian",
        message: getErrorMessage(exception),
      });
    }
  }

  async function runMutation(title: string, operation: () => Promise<void>) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title,
    });

    try {
      await operation();
      await refresh();
      toast.style = Toast.Style.Success;
      toast.title = "Done";
    } catch (exception) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong";
      toast.message = getErrorMessage(exception);
      throw exception;
    }
  }

  if (error) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search your Obsidian todos"
        actions={
          <SharedActions
            notePath={resolvedNotePath}
            onCreate={handleCreate}
            onOpenNote={handleOpenNote}
            onRefresh={refresh}
          />
        }
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load the ToDo note"
          description={`${error}\n\nResolved path: ${resolvedNotePath}`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const openTodos = note?.todos.filter((todo) => !todo.completed) ?? [];
  const completedTodos = note?.todos.filter((todo) => todo.completed) ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your Obsidian todos"
      actions={
        <SharedActions
          notePath={resolvedNotePath}
          onCreate={handleCreate}
          onOpenNote={handleOpenNote}
          onRefresh={refresh}
        />
      }
    >
      {note && note.todos.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No todos yet"
          description="Create your first todo in Obsidian from here."
          actions={
            <SharedActions
              notePath={resolvedNotePath}
              onCreate={handleCreate}
              onOpenNote={handleOpenNote}
              onRefresh={refresh}
            />
          }
        />
      ) : null}

      {openTodos.length > 0 ? (
        <List.Section title="Open" subtitle={`${openTodos.length}`}>
          {openTodos.map((todo) => (
            <TodoListItem
              key={todo.id}
              todo={todo}
              notePath={resolvedNotePath}
              onCreate={handleCreate}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onOpenNote={handleOpenNote}
              onRefresh={refresh}
              onToggle={handleToggle}
            />
          ))}
        </List.Section>
      ) : null}

      {completedTodos.length > 0 ? (
        <List.Section title="Completed" subtitle={`${completedTodos.length}`}>
          {completedTodos.map((todo) => (
            <TodoListItem
              key={todo.id}
              todo={todo}
              notePath={resolvedNotePath}
              onCreate={handleCreate}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onOpenNote={handleOpenNote}
              onRefresh={refresh}
              onToggle={handleToggle}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function TodoListItem(props: {
  todo: TodoItem;
  notePath: string;
  onCreate: (text: string) => Promise<void>;
  onDelete: (todo: TodoItem) => Promise<void>;
  onEdit: (todo: TodoItem, text: string) => Promise<void>;
  onOpenNote: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onToggle: (todo: TodoItem) => Promise<void>;
}) {
  const { todo } = props;

  return (
    <List.Item
      icon={todo.completed ? Icon.CheckCircle : Icon.Circle}
      title={todo.text}
      accessories={[
        {
          tag: {
            value: todo.completed ? "Done" : "Open",
            color: todo.completed ? Color.Green : Color.Blue,
          },
        },
        {
          text: `L${todo.lineIndex + 1}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={todo.completed ? "Mark Incomplete" : "Mark Complete"}
              icon={todo.completed ? Icon.Circle : Icon.CheckCircle}
              onAction={() => props.onToggle(todo)}
            />
            <Action.Push
              title="Edit Todo"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<TodoForm title="Edit Todo" initialText={todo.text} onSubmit={(text) => props.onEdit(todo, text)} />}
            />
            <Action.Push
              title="Add Todo"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<TodoForm title="Add Todo" onSubmit={props.onCreate} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action title="Open ToDo Note" icon={Icon.Link} shortcut={{ modifiers: ["cmd"], key: "o" }} onAction={props.onOpenNote} />
            <Action
              title="Reveal Note in Finder"
              icon={Icon.Folder}
              onAction={() => showInFinder(props.notePath)}
            />
            <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={props.onRefresh} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Delete Todo"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => props.onDelete(todo)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SharedActions(props: {
  notePath: string;
  onCreate: (text: string) => Promise<void>;
  onOpenNote: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="Add Todo"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<TodoForm title="Add Todo" onSubmit={props.onCreate} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action title="Open ToDo Note" icon={Icon.Link} shortcut={{ modifiers: ["cmd"], key: "o" }} onAction={props.onOpenNote} />
        <Action title="Reveal Note in Finder" icon={Icon.Folder} onAction={() => showInFinder(props.notePath)} />
        <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={props.onRefresh} />
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function TodoForm(props: {
  title: string;
  initialText?: string;
  onSubmit: (text: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { text: string }) {
    const text = values.text.trim();

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Todo text is required",
      });
      return;
    }

    await props.onSubmit(text);
    pop();
  }

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.title} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Todo"
        placeholder="Buy groceries"
        defaultValue={props.initialText}
      />
    </Form>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

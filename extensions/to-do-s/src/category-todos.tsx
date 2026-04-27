import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createTodo, deleteTodo, getTodos, toggleTodo, updateTodo } from "./storage";
import { Category, Todo } from "./types";
import { colorFromValue } from "./categories";

function EditTodoForm({ categoryId, todo, onSave }: { categoryId: string; todo: Todo; onSave: () => void }) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(todo.title);
  const [titleError, setTitleError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!title.trim()) {
      setTitleError("Todo cannot be empty");
      return;
    }
    await updateTodo(categoryId, todo.id, title);
    await showToast({ style: Toast.Style.Success, title: "Todo updated" });
    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle="Edit Todo"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Todo"
        placeholder="Todo description…"
        value={title}
        onChange={(v) => {
          setTitle(v);
          setTitleError(undefined);
        }}
        error={titleError}
        autoFocus
      />
    </Form>
  );
}

function CreateTodoForm({
  categoryId,
  categoryName,
  onCreated,
  initialTitle,
}: {
  categoryId: string;
  categoryName: string;
  onCreated: () => void;
  initialTitle?: string;
}) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [titleError, setTitleError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!title.trim()) {
      setTitleError("Todo cannot be empty");
      return;
    }
    await createTodo(categoryId, title);
    await showToast({ style: Toast.Style.Success, title: "Todo created" });
    onCreated();
    pop();
  }

  return (
    <Form
      navigationTitle={`New Todo in ${categoryName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Todo" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Todo"
        placeholder="What do you need to do?"
        value={title}
        onChange={(v) => {
          setTitle(v);
          setTitleError(undefined);
        }}
        error={titleError}
        autoFocus
      />
    </Form>
  );
}

export function CategoryTodosView({ category, onUpdate }: { category: Category; onUpdate: () => void }) {
  const { push } = useNavigation();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  async function loadTodos() {
    setIsLoading(true);
    const data = await getTodos(category.id);
    setTodos(data);
    setIsLoading(false);
    onUpdate();
  }

  useEffect(() => {
    loadTodos();
  }, []);

  async function handleToggle(todo: Todo) {
    await toggleTodo(category.id, todo.id);
    await showToast({
      style: Toast.Style.Success,
      title: todo.completed ? "Todo marked as pending" : "Todo completed!",
    });
    loadTodos();
  }

  async function handleDelete(todo: Todo) {
    const confirmed = await confirmAlert({
      title: `Delete "${todo.title}"`,
      message: "This action cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await deleteTodo(category.id, todo.id);
      await showToast({ style: Toast.Style.Success, title: "Todo deleted" });
      loadTodos();
    }
  }

  const filteredTodos = todos.filter((t) => t.title.toLowerCase().includes(searchText.toLowerCase()));
  const pending = filteredTodos.filter((t) => !t.completed);
  const done = filteredTodos.filter((t) => t.completed).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  const catColor = colorFromValue(category.color);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={category.name}
      searchBarPlaceholder="Search todo…"
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView
        icon={{ source: Icon.Folder, tintColor: catColor }}
        title={`No todos in ${category.name}`}
        description="Press ⌘N to add your first todo."
        actions={
          <ActionPanel>
            <Action
              title="New Todo"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() =>
                push(
                  <CreateTodoForm
                    categoryId={category.id}
                    categoryName={category.name}
                    onCreated={loadTodos}
                    initialTitle={searchText}
                  />,
                )
              }
            />
          </ActionPanel>
        }
      />

      {pending.length > 0 && (
        <List.Section title="Pending" subtitle={`${pending.length}`}>
          {pending.map((todo) => (
            <List.Item
              key={todo.id}
              title={todo.title}
              icon={{ source: Icon.Circle, tintColor: catColor }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Mark as Completed" icon={Icon.Checkmark} onAction={() => handleToggle(todo)} />
                    <Action
                      title="New Todo"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      onAction={() =>
                        push(
                          <CreateTodoForm
                            categoryId={category.id}
                            categoryName={category.name}
                            onCreated={loadTodos}
                            initialTitle={searchText}
                          />,
                        )
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Todo"
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      onAction={() => push(<EditTodoForm categoryId={category.id} todo={todo} onSave={loadTodos} />)}
                    />
                    <Action
                      title="Delete Todo"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => handleDelete(todo)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {done.length > 0 && (
        <List.Section title="Completed" subtitle={`${done.length}`}>
          {done.map((todo) => (
            <List.Item
              key={todo.id}
              title={todo.title}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Mark as Pending" icon={Icon.Circle} onAction={() => handleToggle(todo)} />
                    <Action
                      title="New Todo"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      onAction={() =>
                        push(
                          <CreateTodoForm
                            categoryId={category.id}
                            categoryName={category.name}
                            onCreated={loadTodos}
                            initialTitle={searchText}
                          />,
                        )
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Todo"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => handleDelete(todo)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {todos.length > 0 && (
        <List.Item
          title="New Todo"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="New Todo"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <CreateTodoForm
                      categoryId={category.id}
                      categoryName={category.name}
                      onCreated={loadTodos}
                      initialTitle={searchText}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

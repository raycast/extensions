import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";

interface Todo {
  title: string;
  isCompleted: boolean;
}

export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([
    { title: "Write a todo list extension", isCompleted: false },
    { title: "Explain it to others", isCompleted: false },
  ]);
  function handleCreate(todo: Todo) {
    const newTodos = [...todos, todo];
    setTodos(newTodos);
  }
  function handleToggle(index: number) {
    const newTodos = [...todos];
    newTodos[index].isCompleted = !newTodos[index].isCompleted;
    setTodos(newTodos);
  }

  return (
    <List
      actions={
        <ActionPanel>
          <CreateTodoAction onCreate={handleCreate} />
        </ActionPanel>
      }
    >
      {todos.map((todo, index) => (
        <List.Item
          key={index}
          icon={todo.isCompleted ? Icon.Checkmark : Icon.Circle}
          title={todo.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ToggleTodoAction todo={todo} onToggle={() => handleToggle(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
function ToggleTodoAction(props: { todo: Todo; onToggle: () => void }) {
  return (
    <Action
      icon={props.todo.isCompleted ? Icon.Circle : Icon.Checkmark}
      title={props.todo.isCompleted ? "Uncomplete Todo" : "Complete Todo"}
      onAction={props.onToggle}
    />
  );
}
function CreateTodoForm(props: { onCreate: (todo: Todo) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: { title: string }) {
    props.onCreate({ title: values.title, isCompleted: false });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Todo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" />
    </Form>
  );
}

function CreateTodoAction(props: { onCreate: (todo: Todo) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Todo"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateTodoForm onCreate={props.onCreate} />}
    />
  );
}

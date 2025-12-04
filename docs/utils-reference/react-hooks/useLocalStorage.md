# `useLocalStorage`

A hook to manage a value in the local storage.

## Signature

```ts
function useLocalStorage<T>(key: string, initialValue?: T): {
  value: T | undefined;
  setValue: (value: T) => Promise<void>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
}
```

### Arguments

- `key` - The key to use for the value in the local storage.
- `initialValue` - The initial value to use if the key doesn't exist in the local storage.

### Return

Returns an object with the following properties:

- `value` - The value from the local storage or the initial value if the key doesn't exist.
- `setValue` - A function to update the value in the local storage.
- `removeValue` - A function to remove the value from the local storage.
- `isLoading` - A boolean indicating if the value is loading.

## Example

```tsx
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

const exampleTodos = [
  { id: "1", title: "Buy milk", done: false },
  { id: "2", title: "Walk the dog", done: false },
  { id: "3", title: "Call mom", done: false },
];

export default function Command() {
  const { value: todos, setValue: setTodos, isLoading } = useLocalStorage("todos", exampleTodos);

  async function toggleTodo(id: string) {
    const newTodos = todos?.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)) ?? [];
    await setTodos(newTodos);
  }

  return (
    <List isLoading={isLoading}>
      {todos?.map((todo) => (
        <List.Item
          icon={todo.done ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle}
          key={todo.id}
          title={todo.title}
          actions={
            <ActionPanel>
              <Action title={todo.done ? "Uncomplete" : "Complete"} onAction={() => toggleTodo(todo.id)} />
              <Action title="Delete" style={Action.Style.Destructive} onAction={() => toggleTodo(todo.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

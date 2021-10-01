# Navigation

## API Reference

### useNavigation

A hook that lets you push and pop view components in the navigation stack.

Most likely you won't use this hook too often. To push a new component, use the [PushAction](../user-interface/actions.md#pushaction).
When a user presses `ESC`, we automatically push to the previous component.

#### Signature

```typescript
function useNavigation(): Navigation
```

#### Example

```typescript
import { ActionPanel, Detail, useNavigation } from "@raycast/api";

function Ping() {
  const { push } = useNavigation();

  return (
    <Detail
      markdown="Ping"
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Push" onAction={() => push(<Pong />)} />
        </ActionPanel>
      }
    />
  );
}

function Pong() {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown="Pong"
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Pop" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return <Ping />;
}
```

#### Return

A [Navigation](../user-interface/navigation.md#navigation) object with [Navigation.push](../user-interface/navigation.md#navigation) and [Navigation.pop](../user-interface/navigation.md#navigation) functions.
Use the functions to alter the navigation stack.

### Navigation

Return type of the [useNavigation](../user-interface/navigation.md#usenavigation) hook to perform push and pop actions.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| pop | <code>() => void</code> | Yes | Pop current view component from the navigation stack. |
| push | <code>(component: ReactNode) => void</code> | Yes | Push a new view component to the navigation stack. |

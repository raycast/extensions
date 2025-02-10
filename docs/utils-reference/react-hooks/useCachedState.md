# `useCachedState`

Hook which returns a stateful value, and a function to update it. It is similar to React's `useState` but the value will be kept between command runs.

{% hint style="info" %}
The value needs to be JSON serializable.
{% endhint %}

## Signature

```ts
function useCachedState<T>(
  key: string,
  initialState?: T,
  config?: {
    cacheNamespace?: string;
  },
): [T, (newState: T | ((prevState: T) => T)) => void];
```

### Arguments

- `key` is the unique identifier of the state. This can be used to share the state across components and/or commands (hooks using the same key will share the same state, eg. updating one will update the others).

With a few options:

- `initialState` is the initial value of the state if there aren't any in the Cache yet.
- `config.cacheNamespace` is a string that can be used to namespace the key.

## Example

```tsx
import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [showDetails, setShowDetails] = useCachedState("show-details", false);

  return (
    <List
      isShowingDetail={showDetails}
      actions={
        <ActionPanel>
          <Action title={showDetails ? "Hide Details" : "Show Details"} onAction={() => setShowDetails((x) => !x)} />
        </ActionPanel>
      }
    >
      ...
    </List>
  );
}
```

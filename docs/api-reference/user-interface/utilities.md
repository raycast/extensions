# Utilities

## API Reference

### useId

Generates a memoized random ID.

The generated ID is preserved across renders. It's used internally to generate fallback ID's
for [List.Section](https://developers.raycast.com/api-reference/user-interface/list#list-section) or [List.Item](https://developers.raycast.com/api-reference/user-interface/list#list-item). The generated ID is saved as React `ref` and
won't change unless the React component is unmounted.

#### Signature

```typescript
function useId(defaultId: string, generateId: () => string): string
```

#### Example

```typescript
import { Detail, useId } from "@raycast/api";

export default function Command() {
  const id = useId();
  console.log(id);
  return <Detail key={id} markdown="I remember you 🧠" />;
}
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| defaultId | <code>string</code> | No | The ID that is returned by default. |
| generateId | <code>() => string</code> | Yes | A function that is used to generate a random ID. Uses [randomId](https://developers.raycast.com/api-reference/utilities#randomid) by default. |

#### Return

The an string ID that is either the `defaultId` if provided, or a randomly generated ID with
the `generateId` function.

# Utilities

## API Reference

### useId

Generates a memoized random ID.

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
| defaultId | `string` | No | The ID that is returned by default. |
| generateId | <code>() => string</code> | Yes | A function that is used to generate a random ID. Uses [randomId](../utilities/id.md#randomid) by default. |

#### Return

The an string ID that is either the `defaultId` if provided, or a randomly generated ID with
the `generateId` function.

# ID

## API Reference

### randomId

Generate secure URL-friendly unique ID.

#### Signature

```typescript
function randomId(size: number): string
```

#### Example

```typescript
import { pasteText, randomId } from "@raycast/api";

export default async () => {
  const id = randomId();
  await pasteText(id);
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| size | `number` | No | Size of the ID. The default size is 21. |

#### Return

A random string.

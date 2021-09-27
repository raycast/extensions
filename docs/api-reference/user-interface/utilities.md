# Utilities

## API Reference

### useId

Generates a memoized random ID.

#### Signature

```typescript
function useId(defaultId: string, generateId: () => string): string
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| defaultId | `string` | No | The ID that is returned by default. |
| generateId | `() => string` | Yes | A function that is used to generate a random ID. Uses [randomId](../utilities/id.md#randomid) by default. |

#### Return

The an string ID that is either the `defaultId` if provided, or a randomly generated ID with the `generateId` function.


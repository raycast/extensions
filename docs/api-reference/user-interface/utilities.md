# Utilities

## API Reference

### useId

Generates a memoized random [ID](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/user-interface.md#id).

#### Signature

```typescript
function useId(defaultId: ID, generateId: () => ID): ID
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| defaultId | [`ID`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/user-interface.md#id) | No | The ID that is returned by default. |
| generateId | `() =>` [`ID`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/user-interface.md#id) | Yes | A function that is used to generate a random ID. Uses [randomId](../utilities/id.md#randomid) by default. |

#### Return

The an [ID](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/user-interface.md#id) that is either the `defaultId` if provided, or a randomly generated ID with the `generateId` function.


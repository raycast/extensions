# DimmingDelta

## Properties

| Name               | Type   |
| ------------------ | ------ |
| `action`           | string |
| `brightness_delta` | number |

## Example

```typescript
import type { DimmingDelta } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  action: null,
  brightness_delta: null,
} satisfies DimmingDelta;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DimmingDelta;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

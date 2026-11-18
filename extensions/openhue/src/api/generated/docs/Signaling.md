# Signaling

Feature containing basic signaling properties.

## Properties

| Name       | Type                           |
| ---------- | ------------------------------ |
| `signal`   | string                         |
| `duration` | number                         |
| `color`    | [Array&lt;Color&gt;](Color.md) |

## Example

```typescript
import type { Signaling } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  signal: null,
  duration: null,
  color: null,
} satisfies Signaling;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Signaling;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

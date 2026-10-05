# SceneRecall

## Properties

| Name       | Type                  |
| ---------- | --------------------- |
| `action`   | string                |
| `duration` | number                |
| `dimming`  | [Dimming](Dimming.md) |

## Example

```typescript
import type { SceneRecall } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  action: null,
  duration: null,
  dimming: null,
} satisfies SceneRecall;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SceneRecall;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

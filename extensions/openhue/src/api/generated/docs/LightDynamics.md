# LightDynamics

## Properties

| Name       | Type   |
| ---------- | ------ |
| `duration` | number |
| `speed`    | number |

## Example

```typescript
import type { LightDynamics } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  duration: null,
  speed: null,
} satisfies LightDynamics;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightDynamics;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

# LightGetAllOfDynamics

## Properties

| Name            | Type                                                             |
| --------------- | ---------------------------------------------------------------- |
| `status`        | [SupportedDynamicStatus](SupportedDynamicStatus.md)              |
| `status_values` | [Array&lt;SupportedDynamicStatus&gt;](SupportedDynamicStatus.md) |
| `speed`         | number                                                           |
| `speed_valid`   | boolean                                                          |

## Example

```typescript
import type { LightGetAllOfDynamics } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  status: null,
  status_values: null,
  speed: null,
  speed_valid: null,
} satisfies LightGetAllOfDynamics;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightGetAllOfDynamics;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

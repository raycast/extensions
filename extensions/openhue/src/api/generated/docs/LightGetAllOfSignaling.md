# LightGetAllOfSignaling

Feature containing signaling properties.

## Properties

| Name            | Type                                                 |
| --------------- | ---------------------------------------------------- |
| `signal_values` | [Array&lt;SupportedSignals&gt;](SupportedSignals.md) |
| `estimated_end` | number                                               |
| `colors`        | [Array&lt;Color&gt;](Color.md)                       |

## Example

```typescript
import type { LightGetAllOfSignaling } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  signal_values: null,
  estimated_end: null,
  colors: null,
} satisfies LightGetAllOfSignaling;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightGetAllOfSignaling;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

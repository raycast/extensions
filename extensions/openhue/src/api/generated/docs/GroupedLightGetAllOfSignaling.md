# GroupedLightGetAllOfSignaling

Feature containing basic signaling properties.

## Properties

| Name            | Type                                                 |
| --------------- | ---------------------------------------------------- |
| `signal_values` | [Array&lt;SupportedSignals&gt;](SupportedSignals.md) |

## Example

```typescript
import type { GroupedLightGetAllOfSignaling } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  signal_values: null,
} satisfies GroupedLightGetAllOfSignaling;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GroupedLightGetAllOfSignaling;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

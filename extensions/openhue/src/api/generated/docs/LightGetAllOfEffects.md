# LightGetAllOfEffects

Basic feature containing effect properties.

## Properties

| Name            | Type                                                 |
| --------------- | ---------------------------------------------------- |
| `status`        | [SupportedEffects](SupportedEffects.md)              |
| `status_values` | [Array&lt;SupportedEffects&gt;](SupportedEffects.md) |
| `effect`        | [SupportedEffects](SupportedEffects.md)              |
| `effect_values` | [Array&lt;SupportedEffects&gt;](SupportedEffects.md) |

## Example

```typescript
import type { LightGetAllOfEffects } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  status: null,
  status_values: null,
  effect: null,
  effect_values: null,
} satisfies LightGetAllOfEffects;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightGetAllOfEffects;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

# PowerupDimming

## Properties

| Name      | Type                                                                    |
| --------- | ----------------------------------------------------------------------- |
| `mode`    | string                                                                  |
| `dimming` | number                                                                  |
| `color`   | [LightGetAllOfPowerupDimmingColor](LightGetAllOfPowerupDimmingColor.md) |

## Example

```typescript
import type { PowerupDimming } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  mode: null,
  dimming: null,
  color: null,
} satisfies PowerupDimming;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PowerupDimming;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

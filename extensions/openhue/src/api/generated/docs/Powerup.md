# Powerup

Feature containing properties to configure powerup behaviour of a lightsource.

## Properties

| Name         | Type                                                |
| ------------ | --------------------------------------------------- |
| `preset`     | string                                              |
| `configured` | boolean                                             |
| `on`         | [LightGetAllOfPowerupOn](LightGetAllOfPowerupOn.md) |
| `dimming`    | [PowerupDimming](PowerupDimming.md)                 |

## Example

```typescript
import type { Powerup } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  preset: null,
  configured: null,
  on: null,
  dimming: null,
} satisfies Powerup;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Powerup;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

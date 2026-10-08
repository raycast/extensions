# LightGetAllOfColorGamut

Color gamut of color bulb. Some bulbs do not properly return the Gamut information. In this case this is not present.

## Properties

| Name    | Type                              |
| ------- | --------------------------------- |
| `red`   | [GamutPosition](GamutPosition.md) |
| `green` | [GamutPosition](GamutPosition.md) |
| `blue`  | [GamutPosition](GamutPosition.md) |

## Example

```typescript
import type { LightGetAllOfColorGamut } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  red: null,
  green: null,
  blue: null,
} satisfies LightGetAllOfColorGamut;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightGetAllOfColorGamut;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

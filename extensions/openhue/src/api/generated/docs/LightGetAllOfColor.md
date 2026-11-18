# LightGetAllOfColor

## Properties

| Name         | Type                                                  |
| ------------ | ----------------------------------------------------- |
| `xy`         | [GamutPosition](GamutPosition.md)                     |
| `gamut`      | [LightGetAllOfColorGamut](LightGetAllOfColorGamut.md) |
| `gamut_type` | string                                                |

## Example

```typescript
import type { LightGetAllOfColor } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  xy: null,
  gamut: null,
  gamut_type: null,
} satisfies LightGetAllOfColor;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightGetAllOfColor;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

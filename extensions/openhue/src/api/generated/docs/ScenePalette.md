# ScenePalette

Group of colors that describe the palette of colors to be used when playing dynamics

## Properties

| Name                | Type                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| `color`             | [Array&lt;ColorPaletteGet&gt;](ColorPaletteGet.md)                         |
| `dimming`           | [Array&lt;Dimming&gt;](Dimming.md)                                         |
| `color_temperature` | [Array&lt;ColorTemperaturePalettePost&gt;](ColorTemperaturePalettePost.md) |
| `effects`           | [Array&lt;ScenePaletteEffectsInner&gt;](ScenePaletteEffectsInner.md)       |

## Example

```typescript
import type { ScenePalette } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  color: null,
  dimming: null,
  color_temperature: null,
  effects: null,
} satisfies ScenePalette;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ScenePalette;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

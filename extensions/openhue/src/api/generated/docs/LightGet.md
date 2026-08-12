# LightGet

## Properties

| Name                | Type                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `type`              | string                                                            |
| `id`                | string                                                            |
| `id_v1`             | string                                                            |
| `owner`             | [ResourceIdentifier](ResourceIdentifier.md)                       |
| `metadata`          | [LightGetAllOfMetadata](LightGetAllOfMetadata.md)                 |
| `on`                | [On](On.md)                                                       |
| `dimming`           | [LightGetAllOfDimming](LightGetAllOfDimming.md)                   |
| `color_temperature` | [LightGetAllOfColorTemperature](LightGetAllOfColorTemperature.md) |
| `color`             | [LightGetAllOfColor](LightGetAllOfColor.md)                       |
| `dynamics`          | [LightGetAllOfDynamics](LightGetAllOfDynamics.md)                 |
| `alert`             | object                                                            |
| `signaling`         | [LightGetAllOfSignaling](LightGetAllOfSignaling.md)               |
| `mode`              | string                                                            |
| `gradient`          | object                                                            |
| `effects`           | [LightGetAllOfEffects](LightGetAllOfEffects.md)                   |
| `timed_effects`     | [LightGetAllOfTimedEffects](LightGetAllOfTimedEffects.md)         |
| `powerup`           | [LightGetAllOfPowerup](LightGetAllOfPowerup.md)                   |

## Example

```typescript
import type { LightGet } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": light,
  "id": 3883f8bf-30a3-445b-ac06-b047d50599df,
  "id_v1": /lights/8,
  "owner": null,
  "metadata": null,
  "on": null,
  "dimming": null,
  "color_temperature": null,
  "color": null,
  "dynamics": null,
  "alert": null,
  "signaling": null,
  "mode": null,
  "gradient": null,
  "effects": null,
  "timed_effects": null,
  "powerup": null,
} satisfies LightGet

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightGet
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

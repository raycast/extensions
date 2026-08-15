# LightPut

## Properties

| Name                      | Type                                              |
| ------------------------- | ------------------------------------------------- |
| `type`                    | string                                            |
| `on`                      | [On](On.md)                                       |
| `dimming`                 | [Dimming](Dimming.md)                             |
| `dimming_delta`           | [DimmingDelta](DimmingDelta.md)                   |
| `color_temperature`       | [ColorTemperature](ColorTemperature.md)           |
| `color_temperature_delta` | [ColorTemperatureDelta](ColorTemperatureDelta.md) |
| `color`                   | [Color](Color.md)                                 |
| `dynamics`                | [LightDynamics](LightDynamics.md)                 |
| `alert`                   | [Alert](Alert.md)                                 |
| `signaling`               | [Signaling](Signaling.md)                         |
| `mode`                    | string                                            |
| `gradient`                | [Gradient](Gradient.md)                           |
| `effects`                 | [Effects](Effects.md)                             |
| `timed_effects`           | [LightPutTimedEffects](LightPutTimedEffects.md)   |
| `powerup`                 | [Powerup](Powerup.md)                             |

## Example

```typescript
import type { LightPut } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  type: null,
  on: null,
  dimming: null,
  dimming_delta: null,
  color_temperature: null,
  color_temperature_delta: null,
  color: null,
  dynamics: null,
  alert: null,
  signaling: null,
  mode: null,
  gradient: null,
  effects: null,
  timed_effects: null,
  powerup: null,
} satisfies LightPut;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightPut;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

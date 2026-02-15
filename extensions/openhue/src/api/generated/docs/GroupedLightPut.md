# GroupedLightPut

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
| `alert`                   | [Alert](Alert.md)                                 |
| `signaling`               | [Signaling](Signaling.md)                         |
| `dynamics`                | [Dynamics](Dynamics.md)                           |

## Example

```typescript
import type { GroupedLightPut } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  type: null,
  on: null,
  dimming: null,
  dimming_delta: null,
  color_temperature: null,
  color_temperature_delta: null,
  color: null,
  alert: null,
  signaling: null,
  dynamics: null,
} satisfies GroupedLightPut;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GroupedLightPut;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

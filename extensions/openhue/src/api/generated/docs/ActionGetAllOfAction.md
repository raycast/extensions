# ActionGetAllOfAction

The action to be executed on recall

## Properties

| Name                | Type                                                          |
| ------------------- | ------------------------------------------------------------- |
| `on`                | [On](On.md)                                                   |
| `dimming`           | [Dimming](Dimming.md)                                         |
| `color`             | [Color](Color.md)                                             |
| `color_temperature` | [ColorTemperature](ColorTemperature.md)                       |
| `gradient`          | [Gradient](Gradient.md)                                       |
| `effects`           | [ActionGetAllOfActionEffects](ActionGetAllOfActionEffects.md) |

## Example

```typescript
import type { ActionGetAllOfAction } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  on: null,
  dimming: null,
  color: null,
  color_temperature: null,
  gradient: null,
  effects: null,
} satisfies ActionGetAllOfAction;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ActionGetAllOfAction;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

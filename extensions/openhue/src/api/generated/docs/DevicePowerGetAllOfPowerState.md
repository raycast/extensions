# DevicePowerGetAllOfPowerState

## Properties

| Name            | Type   |
| --------------- | ------ |
| `battery_state` | string |
| `battery_level` | number |

## Example

```typescript
import type { DevicePowerGetAllOfPowerState } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  battery_state: null,
  battery_level: null,
} satisfies DevicePowerGetAllOfPowerState;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DevicePowerGetAllOfPowerState;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

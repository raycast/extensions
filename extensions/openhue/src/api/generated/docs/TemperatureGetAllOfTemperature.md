# TemperatureGetAllOfTemperature

## Properties

| Name                 | Type                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `temperature`        | number                                                                                                |
| `temperature_valid`  | boolean                                                                                               |
| `temperature_report` | [TemperatureGetAllOfTemperatureTemperatureReport](TemperatureGetAllOfTemperatureTemperatureReport.md) |

## Example

```typescript
import type { TemperatureGetAllOfTemperature } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  temperature: 23,
  temperature_valid: null,
  temperature_report: null,
} satisfies TemperatureGetAllOfTemperature;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TemperatureGetAllOfTemperature;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

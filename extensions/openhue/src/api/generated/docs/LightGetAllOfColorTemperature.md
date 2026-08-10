# LightGetAllOfColorTemperature

## Properties

| Name           | Type                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| `mirek`        | number                                                                                  |
| `mirek_valid`  | boolean                                                                                 |
| `mirek_schema` | [LightGetAllOfColorTemperatureMirekSchema](LightGetAllOfColorTemperatureMirekSchema.md) |

## Example

```typescript
import type { LightGetAllOfColorTemperature } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  mirek: null,
  mirek_valid: null,
  mirek_schema: null,
} satisfies LightGetAllOfColorTemperature;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightGetAllOfColorTemperature;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

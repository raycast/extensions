# LightLevelGetAllOfLight

## Properties

| Name                 | Type                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------- |
| `light_level`        | number                                                                                |
| `light_level_valid`  | boolean                                                                               |
| `light_level_report` | [LightLevelGetAllOfLightLightLevelReport](LightLevelGetAllOfLightLightLevelReport.md) |

## Example

```typescript
import type { LightLevelGetAllOfLight } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  light_level: null,
  light_level_valid: null,
  light_level_report: null,
} satisfies LightLevelGetAllOfLight;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightLevelGetAllOfLight;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

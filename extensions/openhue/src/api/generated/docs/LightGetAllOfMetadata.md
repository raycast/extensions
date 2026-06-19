# LightGetAllOfMetadata

Deprecated, use metadata on device level

## Properties

| Name          | Type                                |
| ------------- | ----------------------------------- |
| `name`        | string                              |
| `archetype`   | [LightArchetype](LightArchetype.md) |
| `fixed_mired` | number                              |

## Example

```typescript
import type { LightGetAllOfMetadata } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  name: null,
  archetype: null,
  fixed_mired: null,
} satisfies LightGetAllOfMetadata;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightGetAllOfMetadata;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

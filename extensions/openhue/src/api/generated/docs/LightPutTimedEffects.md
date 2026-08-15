# LightPutTimedEffects

Basic feature containing timed effect properties.

## Properties

| Name       | Type                                              |
| ---------- | ------------------------------------------------- |
| `effect`   | [SupportedTimedEffects](SupportedTimedEffects.md) |
| `duration` | number                                            |

## Example

```typescript
import type { LightPutTimedEffects } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  effect: null,
  duration: null,
} satisfies LightPutTimedEffects;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LightPutTimedEffects;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

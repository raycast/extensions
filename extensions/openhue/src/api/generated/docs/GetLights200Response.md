# GetLights200Response

## Properties

| Name     | Type                                 |
| -------- | ------------------------------------ |
| `errors` | Array&lt;Error&gt;                   |
| `data`   | [Array&lt;LightGet&gt;](LightGet.md) |

## Example

```typescript
import type { GetLights200Response } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  errors: null,
  data: null,
} satisfies GetLights200Response;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GetLights200Response;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

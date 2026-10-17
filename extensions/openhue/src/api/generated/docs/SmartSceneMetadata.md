# SmartSceneMetadata

## Properties

| Name      | Type   |
| --------- | ------ |
| `name`    | string |
| `appdata` | string |

## Example

```typescript
import type { SmartSceneMetadata } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  name: null,
  appdata: null,
} satisfies SmartSceneMetadata;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SmartSceneMetadata;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

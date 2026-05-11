# SceneMetadata

## Properties

| Name      | Type                                        |
| --------- | ------------------------------------------- |
| `name`    | string                                      |
| `image`   | [ResourceIdentifier](ResourceIdentifier.md) |
| `appdata` | string                                      |

## Example

```typescript
import type { SceneMetadata } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  name: null,
  image: null,
  appdata: null,
} satisfies SceneMetadata;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SceneMetadata;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

# SmartSceneMetadataWithImage

## Properties

| Name      | Type                                        |
| --------- | ------------------------------------------- |
| `name`    | string                                      |
| `appdata` | string                                      |
| `image`   | [ResourceIdentifier](ResourceIdentifier.md) |

## Example

```typescript
import type { SmartSceneMetadataWithImage } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  name: null,
  appdata: null,
  image: null,
} satisfies SmartSceneMetadataWithImage;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SmartSceneMetadataWithImage;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

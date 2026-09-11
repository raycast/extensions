# ScenePut

## Properties

| Name           | Type                                     |
| -------------- | ---------------------------------------- |
| `type`         | string                                   |
| `actions`      | [Array&lt;ActionPost&gt;](ActionPost.md) |
| `recall`       | [SceneRecall](SceneRecall.md)            |
| `metadata`     | [SceneMetadata](SceneMetadata.md)        |
| `palette`      | [ScenePalette](ScenePalette.md)          |
| `speed`        | number                                   |
| `auto_dynamic` | boolean                                  |

## Example

```typescript
import type { ScenePut } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  type: null,
  actions: null,
  recall: null,
  metadata: null,
  palette: null,
  speed: null,
  auto_dynamic: null,
} satisfies ScenePut;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ScenePut;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

# SceneGet

## Properties

| Name           | Type                                          |
| -------------- | --------------------------------------------- |
| `type`         | string                                        |
| `id`           | string                                        |
| `id_v1`        | string                                        |
| `owner`        | [ResourceIdentifier](ResourceIdentifier.md)   |
| `actions`      | [Array&lt;ActionGet&gt;](ActionGet.md)        |
| `metadata`     | [SceneMetadata](SceneMetadata.md)             |
| `group`        | [ResourceIdentifier](ResourceIdentifier.md)   |
| `palette`      | [ScenePalette](ScenePalette.md)               |
| `speed`        | number                                        |
| `auto_dynamic` | boolean                                       |
| `status`       | [SceneGetAllOfStatus](SceneGetAllOfStatus.md) |

## Example

```typescript
import type { SceneGet } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": null,
  "id": 3883f8bf-30a3-445b-ac06-b047d50599df,
  "id_v1": /lights/8,
  "owner": null,
  "actions": null,
  "metadata": null,
  "group": null,
  "palette": null,
  "speed": null,
  "auto_dynamic": null,
  "status": null,
} satisfies SceneGet

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SceneGet
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

# GroupedLightGet

## Properties

| Name        | Type                                                              |
| ----------- | ----------------------------------------------------------------- |
| `type`      | string                                                            |
| `id`        | string                                                            |
| `id_v1`     | string                                                            |
| `owner`     | [ResourceIdentifier](ResourceIdentifier.md)                       |
| `on`        | [On](On.md)                                                       |
| `dimming`   | [Dimming](Dimming.md)                                             |
| `alert`     | [GroupedLightGetAllOfAlert](GroupedLightGetAllOfAlert.md)         |
| `signaling` | [GroupedLightGetAllOfSignaling](GroupedLightGetAllOfSignaling.md) |

## Example

```typescript
import type { GroupedLightGet } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": light,
  "id": 3883f8bf-30a3-445b-ac06-b047d50599df,
  "id_v1": /lights/8,
  "owner": null,
  "on": null,
  "dimming": null,
  "alert": null,
  "signaling": null,
} satisfies GroupedLightGet

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GroupedLightGet
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

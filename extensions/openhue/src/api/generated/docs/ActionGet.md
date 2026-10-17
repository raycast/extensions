# ActionGet

## Properties

| Name     | Type                                            |
| -------- | ----------------------------------------------- |
| `type`   | string                                          |
| `id`     | string                                          |
| `id_v1`  | string                                          |
| `owner`  | [ResourceIdentifier](ResourceIdentifier.md)     |
| `target` | object                                          |
| `action` | [ActionGetAllOfAction](ActionGetAllOfAction.md) |

## Example

```typescript
import type { ActionGet } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": light,
  "id": 3883f8bf-30a3-445b-ac06-b047d50599df,
  "id_v1": /lights/8,
  "owner": null,
  "target": null,
  "action": null,
} satisfies ActionGet

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ActionGet
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

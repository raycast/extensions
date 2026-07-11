# BridgeHomeGet

Definition of a bridge resource

## Properties

| Name       | Type                                                     |
| ---------- | -------------------------------------------------------- |
| `type`     | string                                                   |
| `id`       | string                                                   |
| `id_v1`    | string                                                   |
| `children` | [Array&lt;ResourceIdentifier&gt;](ResourceIdentifier.md) |
| `services` | [Array&lt;ResourceIdentifier&gt;](ResourceIdentifier.md) |

## Example

```typescript
import type { BridgeHomeGet } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": null,
  "id": 3883f8bf-30a3-445b-ac06-b047d50599df,
  "id_v1": /lights/8,
  "children": null,
  "services": null,
} satisfies BridgeHomeGet

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as BridgeHomeGet
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

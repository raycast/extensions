# DeviceGet

Definition of a device resource

## Properties

| Name           | Type                                                     |
| -------------- | -------------------------------------------------------- |
| `type`         | string                                                   |
| `id`           | string                                                   |
| `id_v1`        | string                                                   |
| `owner`        | [ResourceIdentifier](ResourceIdentifier.md)              |
| `product_data` | [ProductData](ProductData.md)                            |
| `metadata`     | [DeviceGetAllOfMetadata](DeviceGetAllOfMetadata.md)      |
| `usertest`     | [DeviceGetAllOfUsertest](DeviceGetAllOfUsertest.md)      |
| `services`     | [Array&lt;ResourceIdentifier&gt;](ResourceIdentifier.md) |

## Example

```typescript
import type { DeviceGet } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": null,
  "id": 3883f8bf-30a3-445b-ac06-b047d50599df,
  "id_v1": /lights/8,
  "owner": null,
  "product_data": null,
  "metadata": null,
  "usertest": null,
  "services": null,
} satisfies DeviceGet

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DeviceGet
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

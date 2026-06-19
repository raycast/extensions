# DevicePowerGet

Definition of a bridge power resource

## Properties

| Name          | Type                                                              |
| ------------- | ----------------------------------------------------------------- |
| `type`        | string                                                            |
| `id`          | string                                                            |
| `id_v1`       | string                                                            |
| `owner`       | [ResourceIdentifier](ResourceIdentifier.md)                       |
| `power_state` | [DevicePowerGetAllOfPowerState](DevicePowerGetAllOfPowerState.md) |

## Example

```typescript
import type { DevicePowerGet } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": light,
  "id": 3883f8bf-30a3-445b-ac06-b047d50599df,
  "id_v1": /lights/8,
  "owner": null,
  "power_state": null,
} satisfies DevicePowerGet

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DevicePowerGet
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

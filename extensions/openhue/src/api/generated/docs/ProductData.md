# ProductData

## Properties

| Name                     | Type                                    |
| ------------------------ | --------------------------------------- |
| `model_id`               | string                                  |
| `manufacturer_name`      | string                                  |
| `product_name`           | string                                  |
| `product_archetype`      | [ProductArchetype](ProductArchetype.md) |
| `certified`              | boolean                                 |
| `software_version`       | string                                  |
| `hardware_platform_type` | string                                  |

## Example

```typescript
import type { ProductData } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "model_id": 7602031P7,
  "manufacturer_name": Signify Netherlands B.V.,
  "product_name": Hue Go,
  "product_archetype": null,
  "certified": null,
  "software_version": 1.104.3,
  "hardware_platform_type": 100b-120,
} satisfies ProductData

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ProductData
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

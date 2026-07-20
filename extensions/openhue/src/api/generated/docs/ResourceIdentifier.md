# ResourceIdentifier

## Properties

| Name    | Type   |
| ------- | ------ |
| `rid`   | string |
| `rtype` | string |

## Example

```typescript
import type { ResourceIdentifier } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "rid": 42edd1f5-9538-4180-9ced-2d9e07f26d0f,
  "rtype": null,
} satisfies ResourceIdentifier

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResourceIdentifier
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

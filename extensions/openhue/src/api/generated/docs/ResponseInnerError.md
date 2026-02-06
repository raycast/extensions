# ResponseInnerError

## Properties

| Name          | Type   |
| ------------- | ------ |
| `type`        | number |
| `address`     | string |
| `description` | string |

## Example

```typescript
import type { ResponseInnerError } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": 101,
  "address": null,
  "description": link button bot pressed,
} satisfies ResponseInnerError

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResponseInnerError
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

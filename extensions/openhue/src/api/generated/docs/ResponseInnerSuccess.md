# ResponseInnerSuccess

## Properties

| Name        | Type   |
| ----------- | ------ |
| `username`  | string |
| `clientkey` | string |

## Example

```typescript
import type { ResponseInnerSuccess } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  username: null,
  clientkey: null,
} satisfies ResponseInnerSuccess;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResponseInnerSuccess;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

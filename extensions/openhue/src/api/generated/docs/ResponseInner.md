# ResponseInner

## Properties

| Name      | Type                                            |
| --------- | ----------------------------------------------- |
| `success` | [ResponseInnerSuccess](ResponseInnerSuccess.md) |
| `error`   | [ResponseInnerError](ResponseInnerError.md)     |

## Example

```typescript
import type { ResponseInner } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  success: null,
  error: null,
} satisfies ResponseInner;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResponseInner;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

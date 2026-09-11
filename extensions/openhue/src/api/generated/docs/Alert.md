# Alert

Joined alert control

## Properties

| Name     | Type   |
| -------- | ------ |
| `action` | string |

## Example

```typescript
import type { Alert } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  action: breathe,
} satisfies Alert;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Alert;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

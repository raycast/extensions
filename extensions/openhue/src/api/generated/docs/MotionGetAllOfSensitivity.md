# MotionGetAllOfSensitivity

## Properties

| Name              | Type   |
| ----------------- | ------ |
| `status`          | string |
| `sensitivity`     | number |
| `sensitivity_max` | number |

## Example

```typescript
import type { MotionGetAllOfSensitivity } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  status: null,
  sensitivity: null,
  sensitivity_max: null,
} satisfies MotionGetAllOfSensitivity;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MotionGetAllOfSensitivity;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

# MotionGetAllOfMotion

## Properties

| Name            | Type                                                                    |
| --------------- | ----------------------------------------------------------------------- |
| `motion`        | boolean                                                                 |
| `motion_valid`  | boolean                                                                 |
| `motion_report` | [MotionGetAllOfMotionMotionReport](MotionGetAllOfMotionMotionReport.md) |

## Example

```typescript
import type { MotionGetAllOfMotion } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  motion: null,
  motion_valid: null,
  motion_report: null,
} satisfies MotionGetAllOfMotion;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MotionGetAllOfMotion;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

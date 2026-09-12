# SmartSceneGetAllOfActiveTimeslot

the active time slot in execution

## Properties

| Name          | Type                  |
| ------------- | --------------------- |
| `timeslot_id` | number                |
| `weekday`     | [Weekday](Weekday.md) |

## Example

```typescript
import type { SmartSceneGetAllOfActiveTimeslot } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  timeslot_id: null,
  weekday: null,
} satisfies SmartSceneGetAllOfActiveTimeslot;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SmartSceneGetAllOfActiveTimeslot;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

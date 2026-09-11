# DayTimeslotsGet

## Properties

| Name         | Type                                                           |
| ------------ | -------------------------------------------------------------- |
| `timeslots`  | [Array&lt;SmartSceneTimeslotGet&gt;](SmartSceneTimeslotGet.md) |
| `recurrence` | [Array&lt;Weekday&gt;](Weekday.md)                             |

## Example

```typescript
import type { DayTimeslotsGet } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  timeslots: null,
  recurrence: null,
} satisfies DayTimeslotsGet;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DayTimeslotsGet;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

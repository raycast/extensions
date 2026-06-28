# SmartSceneGet

## Properties

| Name                  | Type                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `type`                | string                                                                  |
| `id`                  | string                                                                  |
| `id_v1`               | string                                                                  |
| `metadata`            | [SmartSceneMetadataWithImage](SmartSceneMetadataWithImage.md)           |
| `group`               | [ResourceIdentifier](ResourceIdentifier.md)                             |
| `week_timeslots`      | [Array&lt;DayTimeslotsGet&gt;](DayTimeslotsGet.md)                      |
| `transition_duration` | number                                                                  |
| `active_timeslot`     | [SmartSceneGetAllOfActiveTimeslot](SmartSceneGetAllOfActiveTimeslot.md) |
| `state`               | string                                                                  |

## Example

```typescript
import type { SmartSceneGet } from '@openhue/client'

// TODO: Update the object below with actual values
const example = {
  "type": null,
  "id": 3883f8bf-30a3-445b-ac06-b047d50599df,
  "id_v1": /lights/8,
  "metadata": null,
  "group": null,
  "week_timeslots": null,
  "transition_duration": null,
  "active_timeslot": null,
  "state": null,
} satisfies SmartSceneGet

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SmartSceneGet
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

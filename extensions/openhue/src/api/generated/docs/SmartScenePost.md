# SmartScenePost

## Properties

| Name                  | Type                                                          |
| --------------------- | ------------------------------------------------------------- |
| `type`                | string                                                        |
| `metadata`            | [SmartSceneMetadataWithImage](SmartSceneMetadataWithImage.md) |
| `group`               | [ResourceIdentifier](ResourceIdentifier.md)                   |
| `week_timeslots`      | [Array&lt;DayTimeslotsGet&gt;](DayTimeslotsGet.md)            |
| `transition_duration` | number                                                        |
| `recall`              | [SmartSceneRecall](SmartSceneRecall.md)                       |

## Example

```typescript
import type { SmartScenePost } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  type: null,
  metadata: null,
  group: null,
  week_timeslots: null,
  transition_duration: null,
  recall: null,
} satisfies SmartScenePost;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SmartScenePost;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

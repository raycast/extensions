# RoomGetAllOfMetadata

configuration object for a room

## Properties

| Name        | Type                              |
| ----------- | --------------------------------- |
| `name`      | string                            |
| `archetype` | [RoomArchetype](RoomArchetype.md) |

## Example

```typescript
import type { RoomGetAllOfMetadata } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  name: null,
  archetype: null,
} satisfies RoomGetAllOfMetadata;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RoomGetAllOfMetadata;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

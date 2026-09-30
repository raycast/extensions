# DevicePut

## Properties

| Name       | Type                                                |
| ---------- | --------------------------------------------------- |
| `type`     | string                                              |
| `metadata` | [DeviceGetAllOfMetadata](DeviceGetAllOfMetadata.md) |
| `identify` | [DevicePutIdentify](DevicePutIdentify.md)           |
| `usertest` | [DevicePutUsertest](DevicePutUsertest.md)           |

## Example

```typescript
import type { DevicePut } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  type: null,
  metadata: null,
  identify: null,
  usertest: null,
} satisfies DevicePut;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DevicePut;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

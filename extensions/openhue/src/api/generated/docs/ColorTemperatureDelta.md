# ColorTemperatureDelta

## Properties

| Name          | Type   |
| ------------- | ------ |
| `action`      | string |
| `mirek_delta` | number |

## Example

```typescript
import type { ColorTemperatureDelta } from "@openhue/client";

// TODO: Update the object below with actual values
const example = {
  action: null,
  mirek_delta: null,
} satisfies ColorTemperatureDelta;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ColorTemperatureDelta;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

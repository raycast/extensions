# Preferences

## API Reference

### getPreferenceValues

Generically typed convenience function that returns a [preferences](../preferences.md#preferences) object where each preference name is mapped to its value.
Note that the values fall back to defined default values.

#### Signature

```typescript
function getPreferenceValues(): Values
```

#### Example

```typescript
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  name: string;
  bodyWeight?: string;
  bodyHeight?: string;
}

export default async () => {
  const preferences: Preferences = getPreferenceValues();
  console.log(preferences);
};
```

#### Return



### preferences

```typescript
preferences: Preferences = ...
```

Contains the preference values (entered in Raycast Preferences) that have been passed to the command.

### Preference

Holds data about a single preference item (entered in Raycast Preferences).
Maps to the properties declared in package.json.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| data | `unknown[]` | No | The data that is used for dropdowns. |
| default | `unknown` | No | The default value of the preference if there is no `value` specified. |
| description | `string` | Yes | The description of the preference. |
| label | `string` | No | A label that is used for checkboxes. |
| link | `string` | No | A link for further information about the preference. |
| name | `string` | Yes | The name of the preference. |
| placeholder | `string` | No | A placeholder that is used for textfields and passwords. |
| required | `boolean` | Yes | Specifies if the preference is required. |
| title | `string` | Yes | The title of the preference. |
| type | `"textfield"` or `"password"` or `"checkbox"` or `"dropdown"` | Yes | The type of the preference. |
| value | `unknown` | No | The value of the preference. |

### PreferenceValues

Values of preference items.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| [name: string] | `any` | Yes |  |

### Preferences

```typescript
Preferences: Record<string, Preference>
```

A record type holding the preferences (entered in Raycast Preferences) that have been passed to the command.

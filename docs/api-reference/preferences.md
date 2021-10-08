# Preferences

Use the Preferences API to make your extension configurable. Preferences can be configured per command or shared in the context of an extension. Required preferences need to be set before a command opens. They are great a way to make sure that the user of your extension has everything set up properly.

## API Reference

### getPreferenceValues

A convenience function for type-safe access to the values of the [preferences](../preferences.md#preferences) object.

Each preference name is mapped to its value and the defined default values are used as fallback values.

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

An object with the preference names as property key and the typed value as property value.

### preferences

```typescript
preferences: Preferences = ...
```

Contains the preference values that have been passed to the command.

### Preference

Holds data about a single preference item (entered in Raycast Preferences). Use the [getPreferenceValues](../preferences.md#getpreferencevalues)
function or the global [preferences](../preferences.md#preferences) object to retrieve values.

The object maps to a defined preference in the `package.json` manifest file.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| data | `unknown[]` | No | The data that is used for dropdowns. |
| default | `unknown` | No | The default value of the preference if there is no `value` specified. |
| description | `string` | Yes | The description of the preference. |
| label | `string` | No | A label that is used for checkboxes. |
| name | `string` | Yes | The name of the preference. |
| placeholder | `string` | No | A placeholder that is used for text fields and passwords. |
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

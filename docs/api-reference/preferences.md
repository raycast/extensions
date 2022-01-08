# Preferences

Use the Preferences API to make your extension configurable. Preferences can be configured per command or shared in the context of an extension. Required preferences need to be set by the user before a command opens. They are great a way to make sure that the user of your extension has everything set up properly.

## API Reference

### getPreferenceValues

A convenience function for type-safe access to the values of the [preferences](#preferences) object.

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
preferences: Preferences = workerData.preferences
```

Contains the preference values that have been passed to the command.

### Preference

Holds data about a single preference item (entered in Raycast Preferences). Use the [getPreferenceValues](#getpreferencevalues)
function or the global [preferences](#preferences) object to retrieve values.

The object maps to a defined preference in the `package.json` manifest file.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| data | <code>unknown[]</code> | No | The data that is used for dropdowns. For the dropdown items, add an array of objects with `title` and `value` properties, such as: `{"title": "Foo", "value": "bar"}` |
| default | <code>unknown</code> | No | The default value of the preference if there is no `value` specified. For dropdowns, this references the `value` property of an object in the data array. |
| description | <code>string</code> | Yes | The description of the preference. |
| label | <code>string</code> | No | A label that is used for checkboxes. You can create checkbox groups by setting this property and leaving the title property empty for all checkboxes except the first. |
| name | <code>string</code> | Yes | The name of the preference. |
| placeholder | <code>string</code> | No | A placeholder that is used for text fields and passwords. |
| required | <code>boolean</code> | Yes | Specifies if the preference is required. |
| title | <code>string</code> | Yes | The title of the preference. |
| type | <code>"textfield"</code> or <code>"password"</code> or <code>"checkbox"</code> or <code>"dropdown"</code> | Yes | The type of the preference. |
| value | <code>unknown</code> | No | The value of the preference. |

### PreferenceValues

Values of preference items.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| [name: string] | <code>any</code> | Yes |  |

### Preferences

```typescript
Preferences: Record<string, Preference>
```

A record type holding the preferences (entered in Raycast Preferences) that have been passed to the command.

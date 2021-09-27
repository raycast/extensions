# Preferences

## API Reference

### getPreferenceValues

Generically typed convenience function that returns a [preferences](https://github.com/raycast/extensions/tree/0dffd9e1dbd114838683b26f2882142d0a6ef504/docs/preferences.md#preferences) object where each preference name is mapped to its value. Note that the values fall back to defined default values.

#### Signature

```typescript
function getPreferenceValues(): Values
```

#### Return

### preferences

```typescript
preferences: Preferences = ...
```

Contains the preference values \(entered in Raycast Preferences\) that have been passed to the command.

### Preference

Holds data about a single preference item \(entered in Raycast Preferences\). Maps to the properties declared in package.json.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| data | `unknown[]` | No |  |
| default | `unknown` | No |  |
| description | `string` | Yes |  |
| label | `string` | No |  |
| link | `string` | No |  |
| name | `string` | Yes |  |
| placeholder | `string` | No |  |
| required | `boolean` | Yes |  |
| title | `string` | Yes |  |
| type | `"textfield"` or `"password"` or `"checkbox"` or `"dropdown"` | Yes |  |
| value | `unknown` | No |  |

### PreferenceValues

Values of preference items.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| \[name: string\] | `any` | Yes |  |

### Preferences

```typescript
Preferences: Record<string, Preference>
```

A record type holding the preferences \(entered in Raycast Preferences\) that have been passed to the command.


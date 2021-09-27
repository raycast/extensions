# Preferences

## API Reference

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
| default | `unknown` | No |  |
| required | `boolean` | Yes |  |
| type | `string` | Yes |  |
| value | `unknown` | No |  |

### Preferences

```typescript
Preferences: Record<string, Preference>
```

A record type holding the preferences \(entered in Raycast Preferences\) that have been passed to the command


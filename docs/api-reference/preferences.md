# Preferences

Use the Preferences API to make your extension configurable. [Preferences](../information/manifest.md/#extensionproperties) can be configured per command or shared in the context of an extension. Required preferences need to be set by the user before a command opens. They are a great way to make sure that the user of your extension has everything set up properly.

## API Reference

### getPreferenceValues

A function to access the [preference values](../information/manifest.md/#extensionproperties) that have been passed to the command.

Each preference name is mapped to its value, and the defined default values are used as fallback values.

#### Signature

```typescript
function getPreferenceValues(): { [preferenceName: string]: any };
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
  const preferences = getPreferenceValues<Preferences>();
  console.log(preferences);
};
```

#### Return

An object with the preference names as property key and the typed value as property value.

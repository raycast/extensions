# API

You can use `launchCommand` to use this extension search result.

## Launch Context Options

### `launchFromExtensionTitle`

Type: `string`\
Default: `undefined`

You can specify the `navigationTitle` when launching this extension.

### `showCopyActions`

Type: `boolean`\
Default: `false`

Copy actions are disabled by default. Set it to `true` to enable copy actions.

### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Use this option to let this extension know what kind of callback needs to be performed when `launchCommand`.

## Callback Context Options

### `icon`

Type: `IconData & { file: string }`

It returns the icon data. The `file` field is the file asset path of the icon, which can be used to copy or open the icon file.

## Launch Example

```jsx
import { crossLaunchCommand } from "raycast-cross-extension";

crossLaunchCommand({
  name: "index",
  type: LaunchType.UserInitiated,
  extensionName: "simple-icons",
  ownerOrAuthorName: "litomore",
  context: {
    launchFromExtensionTitle: "Badges - shields.io",
  },
});
```

## Receive Callback Example

```typescript
import { LaunchProps } from "@raycast/api";

type LaunchContext = {
  icon: IconData;
};

export default function Command({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { icon } = launchContext;
  // ...
}
```

# Color Picker

A simple system-wide color picker. The color picker can be triggered with a standalone command or as part of the menu bar command. The menu bar shows the last nine picked colors. The Organize Colors command can be used to see all colors.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## API

This extensions follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link].

You can use `launchCommand` to use the picker color result.

### Launch Context Options

#### `copyToClipboard`

Type: `boolean`\
Default: `false`

Copy to clipboard is disabled by default. Set it to `true` to enable copy action.

#### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Use this option to let this extension know what kind of callback needs to be performed when `launchCommand`.

### Callback Context Options

#### `hex`

Type: `string`

It returns the color picker hex result.

### Examples

#### Launch Color Picker

```typescript
import { launchCommand, LaunchType } from "@raycast/api";

await launchCommand({
  name: "pick-color",
  type: LaunchType.UserInitiated,
  extensionName: "color-picker",
  ownerOrAuthorName: "thomas",
  context: {
    callbackLaunchOptions: {
      name: "your-command-name",
      type: LaunchType.UserInitiated,
      extensionName: "your-extension-name",
      ownerOrAuthorName: "your-author-name",
      context: {
        launchFromExtensionName: "color-picker",
        // ...
      },
    },
  },
});
```

#### Rececive Callback Result

```typescript
import { LaunchProps } from "@raycast/api";

type LaunchContext = {
  launchFromExtensionName: string;
  hex: string;
};

export default function Command({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { launchFromExtensionName, hex } = launchContext;

  useEffect(() => {
    if (launchContext.launchFromExtensionName === "color-picker" && launchContext.hex) {
      console.log(launchContext.hex);
    }
  }, []);
}
```

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

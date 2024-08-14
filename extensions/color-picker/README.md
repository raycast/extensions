# Color Picker

A simple system-wide color picker. The color picker can be triggered with a standalone command or as part of the menu bar command. The menu bar shows the last nine picked colors. The Organize Colors command can be used to see all colors.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Features

- Pick a color on your desktop
- Access your colors from the menu bar
- Organize your colors
- Generate colors using UI
- Pick a color using AI
- Pick a color with color wheel
- Convert any color to a different format

## API

This extensions follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link].

You can use `crossLaunchCommand` to use the picker color result.

### Launch Context Options

#### `copyToClipboard`

Type: `boolean`\
Default: `false`

Copy to clipboard is disabled by default. Set it to `true` to enable copy action.

#### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Use this option to let this extension know what kind of callback needs to be performed when `crossLaunchCommand`.

### Callback Context Options

#### `hex`

Type: `string`

It returns the color picker hex result.

### Examples

#### Launch Color Picker

```typescript
import { LaunchType } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

await crossLaunchCommand({
  name: "pick-color",
  type: LaunchType.UserInitiated,
  extensionName: "color-picker",
  ownerOrAuthorName: "thomas",
});
```

#### Launch Color Wheel

```typescript
import { LaunchType } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

await crossLaunchCommand({
  name: "color-wheel",
  type: LaunchType.UserInitiated,
  extensionName: "color-picker",
  ownerOrAuthorName: "thomas",
});
```

#### Rececive Callback Result

```typescript
import { LaunchProps } from "@raycast/api";

type LaunchContext = {
  hex?: string;
};

export default function Command({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  useEffect(() => {
    if (launchContext.hex) {
      console.log(launchContext.hex);
    }
  }, []);
}
```

## Who's using Color Picker Cross-Extension API

- [Badges - shields.io](https://raycast.com/litomore/badges) - Concise, consistent, and legible badges

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

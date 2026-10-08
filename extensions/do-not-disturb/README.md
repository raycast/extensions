# Do Not Disturb

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

Turn on "Do Not Disturb" focus mode - This will disable notifications on your Apple devices

The first time you run this action, you will be prompted to install a shortcut. This shortcut is used to enable/disable "Do Not Disturb" mode and only needs to be installed once.

## Commands

- Turn On - Turn on "Do Not Disturb"
- Turn Off - Turn off "Do Not Disturb"
- Toggle - Toggle "Do Not Disturb" status
- Status - Get the current status of "Do Not Disturb"

## API

This extension follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link].

You can use `crossLaunchCommand` or built-in `launchCommand` to use its features.

The `toggle` and `status` has a `dndStatus` callback payload. Possible values are `true` | `false` | `undefined`, the `undefined` means the DND shortcut is not found.

### Examples

```typescript
import { crossLaunchCommand } from "raycast-cross-extension";

crossLaunchCommand({
  name: "on", // Available values are "on", "off", "toggle", "status".
  type: LaunchType.Background,
  extensionName: "do-not-disturb",
  ownerOrAuthorName: "yakitrak",
  context: {
    // Optional. This suppresses the HUD from the `do-not-disturb` extension.
    suppressHUD: true,
  },
});
```

You can also check [this comment](https://github.com/raycast/extensions/pull/15193#issuecomment-2456160305) out for more details.

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

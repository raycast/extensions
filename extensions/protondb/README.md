# ProtonDB

Game information for Proton, Linux, Steam Deck, and SteamOS.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Features

- Browse game scores at ProtonDB

## API

This extensions follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link].

You can use `crossLaunchCommand` or built-in `launchCommand` to call this extension.

### Example

```js
import { crossLaunchCommand } from "raycast-cross-extension";

crossLaunchCommand({
  name: "browse",
  type: LaunchType.UserInitiated,
  extensionName: "protondb",
  ownerOrAuthorName: "litomore",
  context: {
    steamAppName: "Black Myth: Wukong",
  },
});
```

## License

MIT

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

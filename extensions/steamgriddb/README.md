# SteamGridDB

Download and share custom video game assets and personalize your gaming library.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Usage

Before using this extension, please go to https://www.steamgriddb.com/profile/preferences/api to get your API.

## Features

- Browse all types of SteamGridDB images
- Copy any SteamGridDB image to clipboard

## API

This extensions follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link].

You can use `crossLaunchCommand` or built-in `launchCommand` to call this extension.

### Example

```js
import { crossLaunchCommand } from "raycast-cross-extension";

crossLaunchCommand({
  name: "browse",
  type: LaunchType.UserInitiated,
  extensionName: "steamgriddb",
  ownerOrAuthorName: "litomore",
  context: {
    steamAppId: 2358720,
  },
});
```

## License

MIT

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

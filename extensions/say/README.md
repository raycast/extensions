# Say - Text to Speech

This extension uses the macOS built-in TTS ([Live Speech](https://www.youtube.com/watch?v=yiZzm24uSsE)) feature to say the text you provide. No network connection is needed.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Features

- **Type to Say** - Quick type your text and say
- **Text to Say** - Input your text or paragraph and say
- **Selected Text to Say** - Say the selected text on any application
- **Stop Running Say** - Stop the current running Say process
- **Configure Say** - Configure the voice, rate, and output device

## Configurations

Currently, the `Configure Say` command we provided does not alter you system settings.
You can go to your macOS System Settings to download new voices and get more advanced configurations.

See https://support.apple.com/en-us/guide/mac-help/spch638/mac.

## Recommended Voices

Siri is the closest thing to a real human voice. You can go to `System Settings -> Accessibility -> Live Speech`. Pick your favorite Siri voice for the best experience.

## API

With this extension, users can use this extension's configuration page for more settings within Raycast.

### Use `raycast-cross-extension`

This is the most recommended way, `raycast-cross-extension` will verify the `crossExtensions` field in the `package.json`.
This helps your upstream extension provider to get to know who is using their extension. For more details, see [Raycast Cross Extension Conventsions][raycast-cross-extension-link].

```javascript
import { crossLaunchCommand } from "raycast-cross-extension";

crossLaunchCommand({
  name: "typeToSay",
  type: LaunchType.Background,
  extensionName: "say",
  ownerOrAuthorName: "litomore",
  arguments: {
    content: "Hello, world!",
  },
  context: {
    sayOptions: {
      voice: "Cellos",
    },
  },
});
```

### Use `launchCommand`

```javascript
import { launchCommand } from "@raycast/api";

launchCommand({
  name: "typeToSay",
  type: LaunchType.Background,
  extensionName: "say",
  ownerOrAuthorName: "litomore",
  arguments: {
    content: "Hello, world!",
  },
  context: {
    sayOptions: {
      voice: "Cellos",
    },
  },
});
```

### Use Deeplinks

```shell
arguments=$(jq -rR @uri <<< '{"content":"Hello from Deeplinks!"}')
launchContext=$(jq -rR @uri <<< '{"sayOptions":{"voice":"Cello"}}')
deeplink="raycast://extensions/litomore/say/typeToSay?launchType=background&arguments=$arguments&launchContext=$launchContext"
open $deeplink
```

### Use `mac-say`

Get it from https://github.com/LitoMore/mac-say.

It's the macOS built-in `say` interface for JavaScript. You can use this if you want some advanced API usage.

## FAQ

### 1. How to stop a speaking agent?

You could type a space or any other new contents to the `Type to Say` command to abort current speaking agent.

### 2. Some voices can be found in the System Settings but not listed in the Configure Say command

Yes. Not all voices are listed in the Configure Say command, because it's limited by the OS. But You can choose those voices from System Settings.

## License

MIT

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

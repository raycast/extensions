# Say - Text to Speech

This extension uses the built-in text-to-speech engine on macOS (including Siri voices) and Windows. Speech synthesis works offline.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Features

- **Type to Say** - Quick type your text and say
- **Text to Say** - Input your text or paragraph and say
- **Selected Text to Say** - Say the selected text on any application
- **Auto Detect** - Detect the text’s language offline or with Raycast AI and select a matching installed voice
- **Stop Running Say** - Stop the current running Say process
- **Configure Say** - Configure the voice, rate, and output device

## Configurations

In **Configure Say → Speaking Voice**, choose **Auto Detect (Offline)** to match each text to an installed voice using local language detection. If you have access to Raycast AI, you can also choose **Auto Detect (Raycast AI)**. It sends the text to Raycast AI for detection and falls back to local detection when AI is unavailable.

Both modes skip dialect voices and prefer an exact language and region match, then another standard voice for the same language. Chinese text uses Mandarin voices. On macOS, matching voices are ranked Premium, Enhanced, then Standard. Within each tier, Siri voices take priority, with higher voice numbers first. If no voice matches, Say uses the system default.

Currently, the `Configure Say` command we provided does not alter your system settings.
You can go to macOS System Settings or Windows Settings to download new voices and get more advanced configurations.

On macOS, see https://support.apple.com/en-us/guide/mac-help/spch638/mac.
On Windows, open `Windows Settings -> Time & language -> Speech`.

## Siri Voices on macOS

Installed Siri voices and other system voices can be selected directly in **Configure Say → Speaking Voice**. Download additional voices in `System Settings → Accessibility → Read & Speak` (called Spoken Content or Live Speech on some macOS versions), then reopen Configure Say.

Speaking rate and output device selection also work with these voices.

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

### Stop speech from another command

By default, **Stop Running Say** closes the Raycast main window before stopping speech. If you call it from another command, pass `shouldCloseMainWindow: false` in the launch context to stop speech and keep your command’s view open.

```javascript
import { launchCommand, LaunchType } from "@raycast/api";

await launchCommand({
  name: "stopRunningSay",
  type: LaunchType.Background,
  extensionName: "say",
  ownerOrAuthorName: "litomore",
  context: { shouldCloseMainWindow: false },
});
```

For a deeplink, URL-encode `{"shouldCloseMainWindow":false}` as the `launchContext` query parameter.

### Use `native-say`

Get it from https://www.npmjs.com/package/native-say.

It provides JavaScript interfaces for the built-in text-to-speech engines on macOS and Windows. You can use it if you want some advanced API usage.

### Siri voices in cross-extension calls

For Siri voices, pass the `identifier` returned by the **Get Voices** AI tool as `sayOptions.voice`. Existing voice names such as `Cellos` continue to work.

## FAQ

### 1. How to stop a speaking agent?

You could type a space or any other new contents to the `Type to Say` command to abort current speaking agent.

### 2. Some voices can be found in system settings but not listed in the Configure Say command

Download the voice in System Settings, then reopen Configure Say. Installed Siri voices are supported; availability varies by macOS version and language.

## License

MIT

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

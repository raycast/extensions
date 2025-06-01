# API

You can use `launchCommand` to use this extension search result.

## Launch Context Options

### `content`

Type: `string`\
Default: `undefined`

For the text to detect.

### `displayHUD`

Type: `boolean`\
Default: `false`

Optional. For `typeToDetect` command only. It's useful if you want to execute the command in background mode.

### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Use this option to let this extension know what kind of callback needs to be performed when `launchCommand`.

## Callback Context Options

### `languageCode`

Type: `string`

The code of a language, its possible formats are `xx` and `xx_XX`. It can also return an empty string if detecting fails.

### `languageName`

Type: `string`

The name of the language code, we use the [`Intl.DisplayNames`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames) for converting language code to name.

## Launch Example

```jsx
import { LaunchType } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

// Run detector in background
crossLaunchCommand({
  name: "typeToDetect",
  type: LaunchType.Background,
  extensionName: "language-detector",
  ownerOrAuthorName: "litomore",
  arguments: {
    content: "敢为天下先",
  },
  context: {
    displayHUD: true,
  },
});

// Open the Text to Detect command view
crossLaunchCommand({
  name: "textToDetect",
  extensionName: "language-detector",
  ownerOrAuthorName: "litomore",
  context: {
    content: "车到山前必有路",
  },
});
```

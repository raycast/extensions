# API

You can use `crossLaunchCommand` to use ScreenOCR in your extension and receive the recognized text via callback.

## Launch Context Options

### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Use this option to let ScreenOCR know what kind of callback needs to be performed after the OCR process is complete.

## Callback Context Options

### `text`

Type: `string | null`

The recognized text. Returns `null` if no text was detected.

### `error`

Type: `string | undefined`

Error message if OCR failed or no text was detected.

## Launch Example

```typescript
import { LaunchType, open } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

// Call ScreenOCR and receive the result via callback
await crossLaunchCommand({
  name: "recognize-text",
  type: LaunchType.UserInitiated,
  extensionName: "screenocr",
  ownerOrAuthorName: "huzef44",
}).catch(() => {
  // Redirect to Store if ScreenOCR is not installed
  open("raycast://extensions/huzef44/screenocr");
});
```

## Receive Callback Example

```typescript
import { LaunchProps } from "@raycast/api";

type OCRResult = {
  text: string | null;
  error?: string;
};

export default function Command({
  launchContext = {},
}: LaunchProps<{ launchContext?: OCRResult }>) {
  const { text, error } = launchContext;

  if (error) {
    // Handle error
    return;
  }

  if (text) {
    // Use the recognized text
  }
}
```

## Windows behavior

The existing `recognize-text` command and `huzef44/screenocr` identity also work on Windows, using the same `text`/`error` callback fields. Windows returns `text: null` with a human-readable error for no text, cancellation or recognition failure. Callback delivery is attempted once and bypasses the Windows copy/paste preference. Ordinary Windows cancellation is silent. macOS callback behavior is unchanged.

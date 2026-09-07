# API

You can use `crossLaunchCommand` to use ScreenOCR in your extension and receive the recognized text via callback.

The `recognize-text` command supports this contract on macOS and Windows. Its extension identity remains `huzef44/screenocr`. The callback result shape is unchanged.

When `callbackLaunchOptions` is supplied, ScreenOCR returns the result to the caller instead of applying the ordinary copy/paste preference. The macOS capture option to copy an image before recognition can still affect the clipboard.

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

Error message if OCR failed, no text was detected, or the user cancelled capture. Cancellation returns `text: null` and an error message so the caller can stop waiting. Treat error messages as human-readable descriptions rather than stable error codes.

ScreenOCR attempts callback delivery once. If delivery itself fails, it reports that failure without launching the callback again. Ordinary user cancellation without a callback stays silent.

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

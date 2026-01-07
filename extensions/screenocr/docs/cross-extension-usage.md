# Cross-Extension Usage

ScreenOCR can be used as a provider for other Raycast extensions. Other extensions can call ScreenOCR to perform OCR and receive the recognized text via callback.

See the [Cross-Extension Conventions](https://github.com/LitoMore/raycast-cross-extension-conventions) for more details.

## Consumer Setup

Add ScreenOCR to your extension's `crossExtensions` in `package.json`:

```json
{
  "crossExtensions": ["huzef44/screenocr"]
}
```

## Example Usage

```typescript
import { LaunchType, open } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

// Call ScreenOCR and receive the result via callback
await crossLaunchCommand(
  {
    name: "recognize-text",
    type: LaunchType.UserInitiated,
    extensionName: "screenocr",
    ownerOrAuthorName: "huzef44",
  },
  {
    // Your callback command will receive the result
    name: "your-callback-command",
  }
).catch(() => {
  // Redirect to Store if ScreenOCR is not installed
  open("raycast://extensions/huzef44/screenocr");
});
```

## Callback Response

Your callback command will receive a `launchContext` with:

```typescript
type OCRResult = {
  text: string | null; // The recognized text, or null if no text was detected
  error?: string;      // Error message if OCR failed
};
```
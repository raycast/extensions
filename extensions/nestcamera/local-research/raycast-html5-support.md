Querying Perplexity AI using sonar-pro for: Does Raycast support HTML5 video elements in extensions? What are the limitations of Raycast's Detail and Grid components regarding media rendering? Can Raycast extensions use WebView or custom HTML rendering?
Raycast extensions do not support HTML5 video elements or custom HTML rendering. The Detail and Grid components can render markdown and images, but not video or interactive web content. There is no WebView component available in Raycast extensions.

Limitations of Detail and Grid for media:
- Can render static images and GIFs
- Support markdown formatting
- No video playback
- No interactive web elements

Raycast extensions are built with React and render native UI components, not web content. The goal is to provide a native app experience rather than embedded web views.

For video-related functionality, extensions can interact with video players via AppleScript, like toggling Picture-in-Picture mode:

```typescript
import { runAppleScript } from "@raycast/api";

export default async function togglePiP() {
  await runAppleScript('tell application "Safari" to activate');
  await runAppleScript('tell application "System Events" to keystroke "p" using {command down, shift down}');
}
```

But the video playback itself happens in the browser, not within Raycast.
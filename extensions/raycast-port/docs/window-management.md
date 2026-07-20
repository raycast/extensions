# WindowManagement Command API

## Launch Content Options

### `getActiveWindow`

Type: `boolean`\
Default: `undefined`\
Returns: [`Awaited<ReturnType<typeof WindowManagement.getActiveWindow>>`](https://developers.raycast.com/api-reference/window-management#windowmanagement.getactivewindow)

Set to `true` to invoke this function.

Its return value will be set to the `result.activeWindow`.

### `getWindowsOnActiveDesktop`

Type: `boolean`\
Default: `undefined`\
Returns: [`Awaited<ReturnType<typeof WindowManagement.getWindowsOnActiveDesktop>>`](https://developers.raycast.com/api-reference/window-management#windowmanagement.getwindowsonactivedesktop)

Set to `true` to invoke the function.

Its return value will be set to the `result.windowsOnActiveDesktop`.

### `getDesktops`

Type: `boolean`\
Default: `undefined`\
Returns: [`Awaited<ReturnType<typeof WindowManagement.getDesktops>>`](https://developers.raycast.com/api-reference/window-management#windowmanagement.getdesktops)

Set to `true` to invoke the function.

Its return value will be set to the `result.desktops`.

### `setWindowBounds`

Type: [`Parameters<typeof WindowManagement.setWindowBounds>`](https://developers.raycast.com/api-reference/window-management#windowmanagement.setwindowbounds)\
Default: `undefined`

Pass in an array of parameters of the `WindowManagement.setWindowBounds()` function to invoke it.

### `callbackOpen`

Type: [`Parameters<typeof open>`](https://developers.raycast.com/api-reference/utilities#open)\
Default: `undefined`

Callback with URL or path after all port functions. It will replace `RAYCAST_PORT_WINDOW_MANAGEMENT_RESULT` with the result.\
Example: `https://localhost?result=RAYCAST_PORT_WINDOW_MANAGEMENT_RESULT`

### `callbackExec`

Type: [`Parameters<typeof execSync>`](https://nodejs.org/api/child_process.html#child_processexecsynccommand-options)\
Default: `undefined`

Callback with `execSync` after all port functions. The result will be set to the environment variable `RAYCAST_PORT_WINDOW_MANAGEMENT_RESULT`.

This feature is disabled by default. You need to enable it from extension preferences.

### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Callback with [callbackLaunchCommand](https://github.com/LitoMore/raycast-cross-extension-conventions#callbacklaunchcommandoptions-payload).
All parameters follows the [Raycast Cross-Extension Conventions][raycast-cross-extension-link].
The result will be set to callback launch context.

## Port Result

All command results and errors will be set to the `result` object:

```typescript
type Result = {
  activeWindow?: Awaited<ReturnType<typeof WindowManagement.getActiveWindow>>;
  windowsOnActiveDesktop?: Awaited<ReturnType<typeof WindowManagement.getWindowsOnActiveDesktop>>;
  desktops?: Awaited<ReturnType<typeof WindowManagement.getDesktops>>;
  errors?: string[];
};
```

## JavaScript Example

```javascript
import { execSync } from "node:child_process";

const launchContext = {
  getActiveWindow: true,
  getWindowsOnActiveDesktop: true,
  getDesktops: true,
  setWindowBounds: [{ id: "foobar", bounds: "fullscreen" }],

  // Callback open URL or file path
  callbackOpen: ["https://www.raycast.com/?result=RAYCAST_PORT_WINDOW_MANAGEMENT_RESULT", "com.google.Chrome"],

  // Callback execute shell command
  callbackExec: ['echo "$RAYCAST_PORT_WINDOW_MANAGEMENT_RESULT" > ~/result.txt', { shell: true }],

  // Callback launch Raycast command
  callbackLaunchOptions: {
    name: "target-command-name",
    type: "userInitiated",
    extensionName: "target-extension-name",
    ownerOrAuthorName: "target-extension-author-name",
    context: {
      foo: "foo",
      bar: "bar",
    },
  },
};

const context = encodeURIComponent(JSON.stringify(launchContext));
execSync(
  `open "raycast://extensions/litomore/raycast-port/window-management?launchType=background&context=${context}"`,
);
```

## Shell Example

```bash
deeplink="raycast://extensions/litomore/raycast-port/window-management?launchType=background&context=$(jq -rR @uri <<< '{"getWindowsOnActiveDesktop": true, "callbackOpen": ["https://example.com/?result=RAYCAST_PORT_WINDOW_MANAGEMENT_RESULT"]}')"
open $deeplink
```

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

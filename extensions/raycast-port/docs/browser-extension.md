# BrowserExtension Command API

## Launch Context Options

### `getContent`

Type: [`boolean | Parameters<typeof BrowserExtension.getContent>`](https://developers.raycast.com/api-reference/browser-extension#browserextension.getcontent)\
Default: `undefined`\
Returns: [`Awaited<ReturnType<BrowserExtension.getContent>>`](https://developers.raycast.com/api-reference/browser-extension#browserextension.getcontent)

Set to `true` to invoke this function with empty parameters. You can also pass in an array of parameters of the `BrowserExtension.getContent()` function.

Its return value will be set to the `result.content`.

### `getTabs`

Type: `boolean`\
Default: `undefined`\
Returns: [`Awaited<ReturnType<BrowserExtension.getTabs>>`](https://developers.raycast.com/api-reference/browser-extension#browserextension.gettabs)

Set to `true` to invoke the function.

Its return value will be set to the `result.tabs`.

### `callbackOpen`

Type: [`Parameters<typeof open>`](https://developers.raycast.com/api-reference/utilities#open)\
Default: `undefined`

Callback with URL or path after port functions. It will replace `RAYCAST_PORT_BROWSER_EXTENSION_RESULT` with the result.\
Example: `https://localhost?result=RAYCAST_PORT_BROWSER_EXTENSION_RESULT`

### `callbackExec`

Type: [`Parameters<typeof execSync>`](https://nodejs.org/api/child_process.html#child_processexecsynccommand-options)\
Default: `undefined`

Callback with `execSync` after port functions. The result will be set to the environment variable `RAYCAST_PORT_BROWSER_EXTENSION_RESULT`.

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
  content?: string;
  tabs?: Awaited<ReturnType<BrowserExtension.getTabs>>;
  errors?: string[];
};
```

## JavaScript Example

```javascript
import { execSync } from "node:child_process";

const launchContext = {
  getContent: [{ format: "html" }],
  getTabs: true,

  // Callback open URL or file path
  callbackOpen: ["https://www.raycast.com/?result=RAYCAST_PORT_BROWSER_EXTENSION_RESULT", "com.google.Chrome"],

  // Callback execute shell command
  callbackExec: ['echo "$RAYCAST_PORT_BROWSER_EXTENSION_RESULT" > ~/result.txt', { shell: true }],

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
  `open "raycast://extensions/litomore/raycast-port/browser-extension?launchType=background&context=${context}"`,
);
```

## Shell Example

```bash
deeplink="raycast://extensions/litomore/raycast-port/browser-extension?launchType=background&context=$(jq -rR @uri <<< '{"getContent": true, "callbackOpen": ["https://example.com/?result=RAYCAST_PORT_BROWSER_EXTENSION_RESULT"]}')"
open $deeplink
```

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

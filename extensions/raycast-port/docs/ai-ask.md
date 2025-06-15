# AI.ask Command API

## Launch Context Options

### `askPrompt`

Type: `string`\
Default: `undefined`

The prompt text.

### `askOptions`

Type: [`AI.AskOptions`](https://developers.raycast.com/api-reference/ai#ai.askoptions)\
Default: `undefined`

Options of `AI.ask` function.

### `callbackOpen`

Type: [`Parameters<typeof open>`](https://developers.raycast.com/api-reference/utilities#open)\
Default: `undefined`

Callback with URL or path after the `AI.ask`. It will replace `RAYCAST_PORT_AI_ASK_RESULT` with the answer.\
Example: `https://localhost?result=RAYCAST_PORT_AI_ASK_RESULT`

### `callbackExec`

Type: [`Parameters<typeof execSync>`](https://nodejs.org/api/child_process.html#child_processexecsynccommand-options)\
Default: `undefined`

Callback with `execSync` after the `AI.ask`. The result will be set to the environment variable `RAYCAST_PORT_AI_ASK_RESULT`.

This feature is disabled by default. You need to enable it from extension preferences.

### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Callback with [callbackLaunchCommand](https://github.com/LitoMore/raycast-cross-extension-conventions#callbacklaunchcommandoptions-payload).
All parameters follows the [Raycast Cross-Extension Conventions][raycast-cross-extension-link].
The result will be set to callback launch context.

## Port Result

All command results and errors will be set to the `result` object:e

```typescript
type Result = {
  answer?: string;
  errors?: string[];
};
```

## JavaScript Example

```javascript
import { execSync } from "node:child_process";

const launchContext = {
  askPrompt: "Hello, what's your name?",
  askOptions: {
    creativity: "high",
    model: "openai-gpt-4o",
  },

  // Callback open URL or file path
  callbackOpen: ["https://www.raycast.com/?result=RAYCAST_PORT_AI_ASK_RESULT", "com.google.Chrome"],

  // Callback execute shell command
  callbackExec: ['echo "$RAYCAST_PORT_AI_ASK_RESULT" > ~/result.txt', { shell: true }],

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
execSync(`open "raycast://extensions/litomore/raycast-port/ai-ask?launchType=background&context=${context}"`);
```

## Shell Example

```bash
deeplink="raycast://extensions/litomore/raycast-port/ai-ask?launchType=background&context=$(jq -rR @uri <<< '{"askPrompt": "hello", "callbackOpen": ["https://example.com/?result=RAYCAST_PORT_AI_ASK_RESULT"]}')"
open $deeplink
```

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

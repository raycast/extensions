# Raycast Port

This port allows you to use Raycast features out of Raycast.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Features

There is no view for this port. You need access then through [deeplinks](https://developers.raycast.com/information/lifecycle/deeplinks).

- [AI.ask](https://developers.raycast.com/api-reference/ai) (requires [Raycast Pro](https://raycast.com/pro))

More features will be added in the future.

## API

### Launch Context Options

#### `askPrompt`

Type: `string`\
Default: `undefined`

The prompt text.

#### `askOptions`

Type: [AI.AskOptions](https://developers.raycast.com/api-reference/ai#ai.askoptions)\
Default: `undefined`

Options of `AI.ask` function.

#### `callbackOpen`

Type: [Parameters\<typeof open\>](https://developers.raycast.com/api-reference/utilities#open)\
Default: `undefined`

Callback with URL or path after the `AI.ask`. It will replace `RAYCAST_PORT_AI_ANSWER` with the answer.\
Exmaple: `https://localhost?answer=RAYCAST_PORT_AI_ANSWER`

#### `callbackExec`

Type: [Parameters\<typeof exeSync\>](https://nodejs.org/api/child_process.html#child_processexecsynccommand-options)\
Default: `undefined`

Callback with `execSync` after the `AI.ask`. The answer will be set to the environment variable `RAYCAST_PORT_AI_ANSWER`.

This feature is disabled by default. You need to enable it from extension preferences.

#### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Callback with [callbackLaunchCommand](https://github.com/LitoMore/raycast-cross-extension-conventions#callbacklaunchcommandoptions-payload).
All parameters follows the [Raycast Cross-Extension Conventions][raycast-cross-extension-link].
The answer will be set to callback launch context.

### JavaScript Example

```javascript
import { execSync } from "node:child_process";

const launchContext = {
  askPrompt: "Hello, what's your name?",
  askOptions: {
    creativity: "high",
    model: "openai-gpt-4o",
  },

  // Callback open URL or file path
  callbackOpen: ["https://www.raycast.com/?answer=RAYCAST_PORT_AI_ANSWER", "com.google.Chrome"],

  // Callback execute shell command
  callbackExec: ['echo "$RAYCAST_PORT_AI_ANSWER" > ~/answer.txt', { shell: true }],

  // Callback launch Raycast command
  callbackLaunchOptions: {
    name: "target-command-name",
    type: "userInitated",
    extensionName: "target-extension-name",
    ownerOrAuthorName: "target-extension-author-name",
    context: {
      foo: "foo",
      bar: "bar",
    },
  },
};

const context = encodeURIComponent(JSON.stringify(launchContext));
execSync(`open raycast://extensions/litomore/raycast-port/ai-ask?launchType=background&context=${context}`);
```

### Shell Example

```bash
deeplink="raycast://extensions/litomore/raycast-port/ai-ask?launchType=background&context=$(jq -rR @uri <<< '{"askPrompt": "hello", "callbackOpen": ["https://example.com/?answer=RAYCAST_PORT_AI_ANSWER"]}')"
open $deeplink
```

### Tips

1. Please use `encodeURIComponent` instead of `URLSearchParams` due to the [parsing issue of Raycast deeplinks](https://github.com/raycast/extensions/issues/14016).
1. Rememer to add `launchType=background` to your deeplink for a better experience.
1. Raycast is using enums for values like `AI.Model['OpenAI_GPT4']`, you might need to look into [delcaration file](https://cdn.jsdelivr.net/npm/@raycast/api/types/index.d.ts) to find out is real value. For JavaScript users, you can simply import the `@raycast/api` to use them.
1. If you have any questions, you can always check out the source code of this port.

## License

MIT

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

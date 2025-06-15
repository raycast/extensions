# PM2

Adavnced, producing process manager for Node.js.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Features

- View PM2 process list
- Manage PM2 processes (start, stop, restart, reload, delete)
- Run any Raycast Node.js application in PM2 through [Cross-Extension][raycast-cross-extension-link]

## Requirements

- Get Node.js and npm installed on your machine
- Get PM2 installed on your machine

## Principles

Due to runtime reasons, the [pm2](https://npmjs.com/pm2) package won't work in Raycast extension. We used a PM2 wrapper application under the assets folder to bypass this problem.
The extension will run `npm install` under the `pm2-wrapper` folder during the first run.

## API

This extensions follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link]. You can send Node.js application to PM2 through `crossLaunchCommand`.

The API command is disabled by default. Remember to enable it from from your extension configuration before using.

### command

Type: `"start" | "stop" | "restart" | "reload" | "delete"`

#### options

Type: `StartOptions | Pm2Process`

Options for running the [`pm2.start()`](https://pm2.keymetrics.io/docs/usage/pm2-api/#pm2startprocess-fn),
[`pm2.stop()`](https://pm2.keymetrics.io/docs/usage/pm2-api/#pm2stopprocess-fn),
[`pm2.restart()`](https://pm2.keymetrics.io/docs/usage/pm2-api/#pm2restartprocess-fn),
[`pm2.reload()`](https://pm2.keymetrics.io/docs/usage/pm2-api/#pm2reloadprocess-fn),
and [`pm2.delete()`](https://pm2.keymetrics.io/docs/usage/pm2-api/#pm2deleteprocess-fn).

#### RuntimeOptions

Type: `RuntimeOptions`

Optional. Use this option for specifying the runtime properties. The `nodePath` defaults to Raycast's Node.js `process.execPath`.
The default `nodePath` can be changed from extension configuration.

### Example

You can use [raycast-pm2](https://github.com/LitoMore/raycast-pm2) to easily access the API:

```typescript
import path from "node:path";
import { LaunchType, environment } from "@raycast/api";
import { runPm2Command } from "raycast-pm2";

runPm2Command(
  {
    command: "start",
    options: {
      script: path.join(environment.assetsPath, "path-to/your-script.js"),
      name: "your-script",
    },
  },
  {},
  {
    name: "main",
    type: LaunchType.UserInitiated,
    extensionName: "pm2",
    ownerOrAuthorName: "litomore",
  },
);
```

## Contributing

See [CONTRIBUTING.md](https://github.com/raycast/extensions/blob/main/extensions/pm2/CONTRIBUTING.md).

## License

MIT

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

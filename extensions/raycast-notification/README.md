# Raycast Notification

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Raycast HUD

The HUD notifications of Raycast look super nice! Don't you wish you could use them for everything?

Well, this extension makes it easy to display Raycast notifications via a quicklink, making the beautiful Raycast interface accessible to other applications or scripts.

Use it from the terminal like:

> [!IMPORTANT]
> Make sure to url_encode the notificationtext, and of course to validate your input text before using it on the command line.
> Also, success and failure notification types are not supported in background mode.

```shell
open -g "raycast://extensions/maxnyby/raycast-notification/index?launchType=background&arguments=%7B%22title%22%3A%22Notification%20Text%22%7D"
```

```shell
open -g "raycast://extensions/maxnyby/raycast-notification/index?arguments=%7B%22title%22%3A%22Notification%20Text%22%2C%22type%22%3A%22success%22%7D"
```

## Notification Center

Even more! With this extension you can also call the system built-in Notification API!

![](./assets/notification-center.png)

![](./assets/notification-center-with-reply.png)

This extension follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link]. So that you can use `crossLaunchCommand` or built-in `launchCommand` to use its features.

### Examples

```typescript
import { crossLaunchCommand } from "raycast-cross-extension";

crossLaunchCommand({
  name: "index",
  type: LaunchType.Background,
  extensionName: "raycast-notification",
  ownerOrAuthorName: "maxnyby",
  context: {
    notificationCenterOptions: {
      title: "Raycast Notification",
      subtitle: "Notification Center",
      message: "Hello from Raycast",
      reply: "Send your greetings",
    },
  },
});
```

For full API instructions please refer to the [`notifyOptions`](https://github.com/LitoMore/raycast-notifier#notifyoptions).

All `notifyOptions` options are appliable to `notificationCenterOptions`.

#### Deeplink Example

```shell
context='{"notificationCenterOptions":{"title":"Raycast Notification","subtitle":"Notification Center","message": "Hello from Raycast"}}'
deeplink="raycast://extensions/maxnyby/raycast-notification/index?launchType=background&context=$(jq -rR @uri <<< $context)"
open $deeplink
```

## Contributing

```shell
cd raycast-notification

# Install dependencies
npm i

# Get latest prebuilds
npx raycast-notifier-setup

# Happy coding
npm run dev
```

## Related

- [raycast-notifier](https://github.com/LitoMore/raycast-notifier) - Send cross platform native notifications using Raycast

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions

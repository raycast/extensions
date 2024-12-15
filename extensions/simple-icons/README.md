# Brand Icons - simpleicons.org

Browse, search, and copy 3200+ free SVG icons for popular brands from [Simple Icons](https://simpleicons.org).

[![raycast-cross-extension-badge]][raycast-cross-extension-link]
[![raycast-pro-enhanced-badge]][raycast-pro-enhanced-link]

## Disclaimer

We ask that all users read our [legal disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md) before using icons from Simple Icons.

## Features

- View and copy SVG sources
- View and copy brand colors
- Copy CDN links from `cdn.simpleicons.org`, jsDelivr, or unpkg to clipboard
- Open file with a specific application
- View brand aliases, aka-names, and localizations
- View brand guidelines, sources, and licenses
- Keep updating every week
- Expose launch API for other extensions
- Searching icons through AI (requires [Raycast Pro](https://raycast.com/pro))

## API

This extensions follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link].

You can use `launchCommand` to use this extension search result.

### Launch Context Options

#### `launchFromExtensionTitle`

Type: `string`\
Default: `undefined`

You can specify the `navigationTitle` when launching this extension.

#### `showCopyActions`

Type: `boolean`\
Default: `false`

Copy actions are disabled by default. Set it to `true` to enable copy actions.

#### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Use this option to let this extension know what kind of callback needs to be performed when `launchCommand`.

### Callback Context Options

#### `icon`

Type: `IconData`

It returns the icon data.

### Launch Example

```jsx
import { crossLaunchCommand } from "raycast-cross-extension";

crossLaunchCommand({
  name: "index",
  type: LaunchType.UserInitiated,
  extensionName: "simple-icons",
  ownerOrAuthorName: "litomore",
  context: {
    launchFromExtensionTitle: "Badges - shields.io",
  },
});
```

### Receive Callback Example

```typescript
import { LaunchProps } from "@raycast/api";

type LaunchContext = {
  icon: IconData;
};

export default function Command({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { icon } = launchContext;
  // ...
}
```

## Links

- [Request a new icon](https://github.com/simple-icons/simple-icons/issues/new?labels=new+icon&template=icon_request.yml)
- [Report an outdated icon](https://github.com/simple-icons/simple-icons/issues/new?labels=update+icon%2Fdata&template=icon_update.yml)

## Related

- [Simple Icons](https://simpleicons.org)
- [Simple Icons CDN](https://github.com/LitoMore/simple-icons-cdn)
- [Third-party extensions](https://github.com/simple-icons/simple-icons#third-party-extensions)

## License

MIT

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions
[raycast-pro-enhanced-badge]: https://shields.io/badge/Raycast-Pro_Enhanced-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-pro-enhanced-link]: https://github.com/LitoMore/raycast-pro-enhanced-extensions

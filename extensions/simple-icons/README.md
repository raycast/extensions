# Brand Icons - simpleicons.org

Browse, search, and copy 3100+ free SVG icons for popular brands from [Simple Icons](https://simpleicons.org).

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

## API

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

#### `launchFromExtensionName`

Type: `string`

It returns `simple-icons`.

#### `icon`

Type: `IconData`

It returns the icon data.

### Launch Example

```jsx
launchCommand({
  name: "index",
  type: LaunchType.UserInitiated,
  extensionName: "simple-icons",
  ownerOrAuthorName: "litomore",
  context: {
    launchFromExtensionTitle: "Badges - shields.io",
    showCopyActions: true,
    callbackLaunchOptions: {
      name: "createStaticBadge",
      type: LaunchType.UserInitiated,
      extensionName: "badges",
      ownerOrAuthorName: "litomore",
    },
  },
});
```

### Receive Callback Example

```jsx
import {LaunchProps} from '@raycast/api';

type LaunchContext = {
  launchFromExtensionName: string;
  icon: IconData,
}

export default function Command({launchContext = {}}: LaunchProps<{launchContext?: LaunchContext}>) {
  const {launchFromExtensionName, icon} = launchContext;
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

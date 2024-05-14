# Say - Spoken Content

This extension uses the macOS built-in [Spoken Content](https://www.youtube.com/watch?v=yiZzm24uSsE) feature to say the text you provide. No network connection is needed.

## Features

- **Type to Say** - Quick type your text and say.
- **Text to Say** - Input your text or paragraph and say.

## Configurations

Currently, the `Configure Say` command we provided does not alter you system settings.
You can go to your macOS System Settings to download new voices and get more advanced configurations.

See https://support.apple.com/en-us/guide/mac-help/spch638/mac.

## API

### With `launchCommand`

We recommned using `launchCommand` to use this extension. Users can use this extension's configuration page for more settings within Raycast.

```javascript
launchCommand({
  name: "typeToSay",
  type: LaunchType.Background,
  extensionName: "say",
  ownerOrAuthorName: "litomore",
  arguments: {
    content: "Hello, world!",
  },
});
```

### With `mac-say`

Get it from https://github.com/LitoMore/mac-say.

It's the macOS built-in `say` interface for JavaScript. You can use this if want some advanced API usage.

## License

MIT

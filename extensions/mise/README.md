# mise Tool Manager for Raycast

Manage development tools installed by [mise](https://mise.jdx.dev/) from Raycast.

## Features

- View installed and available tools
- Install tools or specific versions
- Activate and upgrade installed tools
- Remove tools

## Requirements

- macOS
- [Raycast](https://www.raycast.com/)
- [mise](https://mise.jdx.dev/) available on your `PATH`

Install mise if needed:

```bash
curl https://mise.run | sh
```

## Development

```bash
npm install
npm run dev
```

Before submitting to the Raycast Store:

```bash
npm run lint
npm run build
npm run publish
```

`npm run publish` authenticates with GitHub and opens a pull request against [`raycast/extensions`](https://github.com/raycast/extensions).

## Credits

Originally created by [fredrikmwold](https://github.com/fredrikmwold) for Vicinae and migrated to Raycast by [SanderSpiegelaar](https://github.com/SanderSpiegelaar).

## License

[MIT](LICENSE)

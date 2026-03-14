<p align="center">
  <img src="./assets/icon.png" alt="OpenCast icon" width="96" height="96" />
</p>

<h1 align="center">OpenCast</h1>

<p align="center">A Raycast extension for chatting with a local OpenCode server.</p>

<p align="center">
  <a href="https://www.raycast.com/">Raycast</a>
  ·
  <a href="https://opencode.ai/">OpenCode</a>
  ·
  <a href="./LICENSE">MIT License</a>
</p>

OpenCast lets you start a new session, continue existing sessions, switch project directories, and stay inside Raycast while OpenCode streams responses.

## Features

- Start a new OpenCode session from Raycast
- Continue existing sessions
- Stream responses in the detail pane
- Switch targets quickly
- Pick models for new chats
- Handle permission and question requests

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run lint
npm run dev
```

## Preferences

- `Server URL`: optional override for the OpenCode server
- `Username`: optional basic auth username
- `Password`: optional basic auth password
- `Default Directory`: optional default repo path

## Commands

- `Message OpenCode`
- `List Sessions`
- `Set Directory`

## Publish

When the extension is ready for submission:

```bash
npm run publish
```

Raycast will validate the extension and walk through the official publish flow.

## License

MIT

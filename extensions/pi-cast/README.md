# Pi Cast

Launch [Pi](https://pi.dev/) coding agent sessions in Terminal without leaving Raycast.

## Commands

| Command     | What it does                                  |
| ----------- | --------------------------------------------- |
| Open Pi     | Starts a new Pi session.                      |
| Continue Pi | Continues the latest session for the project. |
| Resume Pi   | Opens Pi's session picker.                    |

Each command accepts an optional project directory and initial prompt. If you leave the directory blank, Pi Cast uses the selected Finder item and falls back to your home directory.

## Requirements

- macOS with Terminal and Raycast installed
- Pi available in your terminal's `PATH`

Install Pi with npm:

```sh
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

macOS asks for permission the first time Raycast controls Terminal. Allow Raycast under **System Settings → Privacy & Security → Automation**.

## Development

```sh
npm install
npm run dev
```

Run the release checks with:

```sh
npm run lint
npm run build
```

Pi Cast is an independent community extension and is not affiliated with the Pi project.

The extension icon uses the official Pi mark published at [pi.dev/favicon.svg](https://pi.dev/favicon.svg).

# Codex Usage

Raycast extension for checking your Codex usage from the command palette.

## What it shows

- Your Codex rate limits, including the 5-hour limit and weekly limit when available
- Remaining usage for each window, with a color indicator based on how close you are to the limit
- Available usage resets, the earliest expiry, and a detail view with every reset's grant and expiry dates
- Recent session activity:
  - Sessions used today
  - Sessions used in the last 7 days
  - Your latest session and when it was updated
- Installed Codex skills, split into your skills and built-in skills

## Requirements

- macOS
- [Raycast](https://www.raycast.com/)
- [Codex CLI](https://openai.com/codex) installed and available on your system `PATH`
- You must be signed in to Codex with `codex login`

## Usage

1. Install the extension in Raycast.
2. Run `View Codex Usage`.
3. Review your current rate limits, recent sessions, and skills.

The command also includes a shortcut to open the Codex usage settings page in your browser.

## Troubleshooting

If the command fails to load:

- Confirm that `codex` runs in Terminal
- Make sure you are signed in with `codex login`
- Check that the CLI is installed in a standard location such as `/opt/homebrew/bin/codex` or `/usr/local/bin/codex`

If Raycast still cannot find the CLI, add the Codex binary to your `PATH` and try again.

## Development

```bash
npm install
npm run dev
```

## License

MIT

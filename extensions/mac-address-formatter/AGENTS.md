# AGENTS.md

## Project

This project is a Raycast extension that:

- Takes a user's MAC address string as input.
- Accepts MAC address input in any supported MAC address format.
- Converts the MAC address string into the user's desired format.
- Copies the resulting MAC address string to the user's clipboard.

## Supported MAC Address Input Formats

- Colon-separated: `XX:XX:XX:XX:XX:XX`
- Hyphen-separated: `XX-XX-XX-XX-XX-XX`
- Dot-separated: `XXXX.XXXX.XXXX`
- Without separators: `XXXXXXXXXXXX`

## Local Environment

- Raycast is installed via Homebrew.
- Raycast location: `/opt/homebrew/Caskroom/raycast/1.104.9`
- Node.js is installed via Homebrew.
- Node.js version: `25.8.0`
- Node.js binary: `/opt/homebrew/bin/node`
- npm is installed via Homebrew.
- npm version: `11.11.0`
- npm binary: `/opt/homebrew/bin/npm`

## Working Assumptions

- The target platform is macOS.
- Raycast is available locally and can be used for extension development.
- Use the Homebrew-installed Node.js and npm binaries when running project commands.

## Project Commands

Run commands from the repository root:

```bash
/opt/homebrew/bin/npm install
/opt/homebrew/bin/npm run dev
/opt/homebrew/bin/npm run lint
/opt/homebrew/bin/npm run build
```

## Notes For Agents

- Prefer the explicit Homebrew paths above if the shell environment is ambiguous.
- Keep Raycast extension configuration in `package.json`.
- Shared command logic lives in `src/mac-address-command.tsx`.
- Command entry points are the four files in `src/convert-to-*.tsx`.

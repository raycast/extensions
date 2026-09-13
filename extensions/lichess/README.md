# Lichess Raycast Extension

Raycast extension for Lichess. The MVP includes:

- Recent public games for a configured Lichess username
- Quick actions to open games in Lichess or copy PGN/FEN/URL
- FEN or PGN input that opens directly in the Lichess Analysis Board
- Public game launch, rapid 10+0 by default
- Quick link to the Lichess game setup page

## Requirements

- Raycast installed
- Node.js compatible with the Raycast extension toolchain
- npm

## Setup

Install dependencies:

```bash
npm install
```

Start the extension in Raycast development mode:

```bash
npm run dev
```

Raycast will open the extension in development mode. Open Raycast Preferences, find the Lichess extension, and set:

- `Lichess Username`: the public Lichess username used by the `Recent Games` command
- `Lichess API Token` in `Create Game` preferences: create one at https://lichess.org/account/oauth/token, enable `board:play`, then paste it in Raycast

The `Create Game` form asks for:

- `Game Time`: minutes per side, `10` by default
- `Increment`: seconds per move, `0` by default
- `Rated / Casual`: enabled creates a rated game; disabled creates a casual game
- `Color`: random, white, or black

## Commands

### Recent Games

Fetches recent public games from the Lichess public API and displays them in a Raycast `List`.

Each game shows:

- opponent
- result
- player ratings
- speed
- date

Available actions:

- Open Game on Lichess
- Copy PGN
- Copy FEN
- Copy Game URL

### Analyze Position / Game

Paste a FEN or PGN. The command detects the input type and opens it in the Lichess Analysis Board.

Invalid input shows a clear Raycast error toast.

### Create Game

Creates a public Lichess seek from a Raycast form. It defaults to `10+0`, rated, random color.

Creating the seek requires a Lichess API token with the `board:play` scope. Without a token, Create Game shows setup instructions and links to the command preferences.

### New Game

Opens the Lichess game setup page, where you can choose the game settings manually.

## Development

Run type checking:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Run Raycast linting:

```bash
npm run lint
```

Run unused code and dependency checks:

```bash
npm run knip
```

Build the extension:

```bash
npm run build
```

Publish the extension to Raycast:

```bash
npm run publish
```

Raycast Store publishing expects npm and a committed `package-lock.json`. The package is marked as private to prevent accidental publication to the npm registry.

## Architecture

- `src/api/lichess.ts`: Lichess HTTP API calls and API errors
- `src/types/lichess.ts`: TypeScript types and view models
- `src/lib/formatGame.ts`: game formatting for the Raycast UI
- `src/lib/chess.ts`: FEN/PGN validation and conversion helpers
- `src/lib/lichessUrls.ts`: Lichess URL helpers
- `src/lib/timeControl.ts`: clock parsing and Lichess Board API time-control validation
- `test/lib.test.ts`: Node.js tests for pure helpers and formatting logic
- `src/recent-games.tsx`: Recent Games command
- `src/analyze-position-game.tsx`: Analyze Position / Game command
- `src/create-game.tsx`: Create Game command
- `src/new-game.tsx`: New Game command

## Testing

Tests use the native Node.js test runner (`node:test`) with `node:assert/strict`.

Jest or Vitest are not used for now because the tested code is mostly pure TypeScript helpers: FEN/PGN parsing, URL building, time-control validation, and formatting. The native runner keeps the project lighter, avoids extra test framework configuration, and is enough for the current MVP.

`npm test` compiles the test target with `tsconfig.test.json`, writes temporary output to `.tmp/test-build`, then runs Node.js tests against the compiled files.

## API Notes

The extension uses the public Lichess export endpoint:

```text
GET https://lichess.org/api/games/user/{username}
Accept: application/x-ndjson
```

Recent games do not use Lichess authentication, so they only access public games.

The `Create Game` command is the only feature that can use authentication. Lichess requires an API token with `board:play` to create public seeks through the Board API.

Lichess does not provide a documented final FEN field in this endpoint response. The extension computes the final FEN from the PGN using `chess.js`.

PGN analysis URLs are best suited to simple movetext. Full PGNs with tags or complex variations may not be accepted directly by Lichess Analysis URL handling.

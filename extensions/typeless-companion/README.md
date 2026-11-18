# Typeless Companion

Unofficial Raycast companion for local Typeless transcripts.

## Commands

- `Browse History`: Search Typeless history, copy or paste saved transcripts, and spot `No Transcript` entries.
- `Copy Previous Transcript`: Copy the latest matching transcript without opening Raycast.

## Settings

- `Transcript Type`: Choose latest transcript, dictation, Ask Anything, or translation for quick copy.
- `Window Behavior On Copy`: Keep Raycast open, close it, or close and exit after copying from history.
- `Database Path`: Override Typeless's local database path.

## Notes

- Reads Typeless's local SQLite database only.
- Does not call private Typeless APIs.
- Empty or failed rows are shown as `No Transcript`.

## Development

```sh
npm install
npm run dev
```

Build and checks:

```sh
npm run build
npm run lint
```

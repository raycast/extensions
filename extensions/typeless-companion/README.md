# Typeless Companion

Unofficial Raycast companion for local Typeless history.

It reads Typeless's local SQLite history database and does not call private Typeless APIs.

## Commands

- `View Typeless History`: Browse, filter, copy, paste, and open retry-needed rows.
- `Copy Last Typeless Transcript`: Copy the newest saved dictation transcript.

## Notes

- Retry uses Typeless's built-in History view.
- Dictionary editing is not supported.

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

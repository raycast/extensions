# Supervoc (Raycast, private org store)

Capture English text: quick translation, Agent analysis, automatic save to your Supervoc server.

## Setup

1. For a **private organization** store, set `owner` in `package.json` to your org handle (Raycast → Manage Organization → Copy Organization Handle, ⌘⇧.). Set `author` to your Raycast username (`vitalii_popov`).
2. Sign in: `npx ray login`
3. Open [https://supervoc.vpopov.dev/token](https://supervoc.vpopov.dev/token) through miniauth and copy the access token.
4. Raycast → Extensions → Supervoc → Preferences: server URL and access token.

See [docs/cursor/dev-auth.md](../../docs/cursor/dev-auth.md).

## Develop

```bash
cd raycast/supervoc
npm install
npm run dev
```

## Publish (private org store)

```bash
npm run lint
npm run publish
```

The command verifies, builds, and publishes to your organization store. Share the clipboard link with teammates.

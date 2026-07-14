# Techmeme

Browse Techmeme from Raycast with a focused command set:

- Browse the current front page and the reverse-chronological River.
- Search story headlines, sources, summaries, and related coverage locally.
- Keep the main list wide for headline scanning; open story details when needed.
- Open the original article, Techmeme permalink, related coverage, or social post.
- Copy a story as Markdown or copy the original/Techmeme URL.
- Use the dedicated River command when reverse-chronological scanning is the goal.

This is an unofficial Techmeme client for Raycast. It uses Techmeme's public web pages and links back to Techmeme and the original publications.

## Development

Use npm for development:

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

Raycast Store publishing uses npm and `package-lock.json`:

```bash
npm ci
npm run build
npm run publish
```

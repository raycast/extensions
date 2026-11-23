# QRdx for Raycast

A [Raycast](https://www.raycast.com) extension that makes styled QR codes, built with the [`qrdx`](../../packages/qrdx) library. It isn't in the Raycast Store yet, so you install it from source.

- **Generate QR:** enter a URL or text, pick body, eye and dot patterns from previews, colors, a call-to-action frame with your label (such as "Scan me") and a logo. Copy the code as PNG or SVG, or save either to `~/Downloads`.
- **Saved QR Codes:** save a code's settings, then browse them with a preview of each, edit and export them later. They're kept in Raycast's local storage. Codes saved with a template, before frames replaced templates, still show and export with it.
- **Generate QR with AI:** describe the code you want and Raycast AI fills in the settings. This command and the AI tools in `ai.yaml` need access to Raycast AI.
- **Open in QRdx Playground** (⌘O) opens the full editor at qrdx.dev with the code's web address. Other content, colors and patterns stay in Raycast.

It depends on `qrdx` 0.0.60 from npm and offers every body pattern, eye frame, eye center and call-to-action frame that version offers, taken from `qrdx` itself, so updating `qrdx` brings its new shapes and frames along. The AI tool checks a frame's name against that list and answers with the valid names when it doesn't know one.

## Install from source

You need Raycast, Node.js 22 (22.22.3 or later) and [Bun](https://bun.com/docs/installation) 1.4. From the root of this repository:

```bash
bun install
bun run --filter qrdx-raycast dev     # ray develop: loads the extension into Raycast
```

The commands then show up in Raycast's root search. `bun run --filter qrdx-raycast build` builds the extension without opening Raycast, and `bun run --filter qrdx-raycast lint` runs Raycast's linter (ESLint and Prettier).

## Publishing to the Raycast Store

The Raycast Store builds the extension with npm, so this folder keeps a `package-lock.json` beside `package.json`. npm can't run inside this repository, so after changing a dependency, rewrite the lockfile from the root with `bun run raycast:lock` (it resolves the extension in a temporary folder). A repository test fails while the lockfile and `package.json` disagree.

Store screenshots go in `metadata/` (2000 × 1250 PNG, up to six; Raycast's Window Capture can save them there). Then `bun run raycast:publish` from the root opens the pull request to `raycast/extensions`.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## License

[MIT](LICENSE)

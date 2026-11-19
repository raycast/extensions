# read-this-later (Clipfile — Raycast extension)

Raycast extension for the Clipfile list: browse and read saved articles, save the current
browser tab. **Published in the Raycast store**, so changes here are user-facing. Repo:
`github.com/shearmds/read-this-later`. `README.md` documents the commands and keybindings.

Part of the four-repo Clipfile family — `ReadLater` (iOS, App Store), `readlater-sync`
(the Worker, live users), `dia-read-later` (browser extension), and this one. Don't confuse it
with `ReadThisLater`, which is a static marketing site.

## Commands

```sh
npm run dev      # ray develop — live-reloads into Raycast
npm run build    # ray build -e dist
npm run lint     # ray lint     (npm run fix-lint to autofix)
npm test         # vitest run
npx @raycast/api@latest publish   # publishes to the store — deliberate act
```

**This is the one project in the family with a real test suite (vitest).** Run it before
publishing; the store review round-trip is slow and the interop test is what catches a crypto
or API-shape break against the Worker.

## Things worth knowing

- **Article bodies are end-to-end encrypted** and must stay interoperable with the iOS app, the
  browser extension and the Worker. A change to encoding or crypto here breaks the others
  silently — that's what the interop test exists for.
- Article extraction runs through `@mozilla/readability` + `linkedom`, sanitized with
  `dompurify`, converted to markdown with `turndown` (+ GFM plugin). Site-specific cleanup
  lives in that pipeline — e.g. NYT audio-player furniture is stripped explicitly. Expect to add
  cases rather than find a general fix.
- `metadata/` holds the store screenshots. They're checked by Raycast's automated image
  validator, which has rejected screenshots before — if a publish fails on images, that's why,
  not the code.
- "Save Current Tab" reads the frontmost tab across Safari, Chrome, Dia, Arc, Brave, Edge,
  Vivaldi and Opera. Full text capture additionally needs the Raycast browser extension
  connected; without it the save still works, just without the body.

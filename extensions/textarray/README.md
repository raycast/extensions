# TextArray for Raycast

Run 540+ [TextArray](https://textarray.com) text tools on your selected text or
clipboard, without leaving the keyboard. Case conversion, encoding, cleaning,
formatting, ciphers, generators and more.

**Everything runs locally.** The tools are the exact same pure functions that
power the website, bundled into the extension at build time — no network calls,
nothing leaves your machine. "Open on textarray.com" carries the input in the
URL fragment (`#s=…`), which the browser never sends to a server.

## Usage

1. Select text in any app (or copy it).
2. Run **Run TextArray Tool** in Raycast.
3. Search for a tool, then:
   - `↵` — paste the result into the frontmost app
   - `⌘C` — copy the result to the clipboard
   - `⌘O` — open the full tool on textarray.com
   - `⌘R` — reload the input from the current selection

Generators (password, UUID, lorem…) ignore the input and produce output on
their defaults.

## Development

The tool catalog is a self-contained bundle generated from the site's
registry — never edit `src/catalog.gen.js` / `src/catalog.gen.d.ts` by hand.

```bash
# from the repo root:
yarn raycast:gen        # rebundle src/catalog.gen.js from src/data/tools.ts

# from raycast/:
npm install
npm run dev             # ray develop
npm run build           # ray build
```

Run `yarn raycast:gen` after changing any tool so the extension can't drift from
the live tool set.

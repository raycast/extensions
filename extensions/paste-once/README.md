# Paste Once

Unofficial Raycast port of [Trimmy](https://github.com/steipete/Trimmy) by Peter Steinberger.

Flatten a copied multi-line shell snippet into one pasteable command. This extension is on-demand: it does not watch the clipboard in the background and is not affiliated with the original app.

Helps when a README command breaks across lines and the shell runs it three times, when a shared link is stuffed with `utm_` parameters, when markdown was hard-wrapped in an email or PR, or when you want a formatted preview before pasting into an app that does not read `#` and `-`.

## Commands

- **Paste Trimmed** — flatten the clipboard and paste into the frontmost app
- **Copy Trimmed** — flatten the clipboard and leave the result copied
- **Clean URL** — type a URL in root search (or leave the field empty to use the clipboard), strip tracking params, copy the result
- **Render Markdown** — copy markdown, preview it formatted, then copy or paste into apps that do not read markdown markers
- **Reflow Markdown** — join hard-wrapped markdown (keep headings, lists, fences), then copy or paste the source

## Preferences

Open **Raycast Settings → Extensions → Paste Once**:

- Sensitivity: Low / Normal / High (default High — these commands only run when you invoke them)
- Preserve blank lines
- Remove box-drawing characters
- Flatten Claude Code prompts
- Extra URL keep rules (`domain.com: param1, param2`)

Assign hotkeys to **Paste Trimmed** and **Copy Trimmed** if you want them as drop-in replacements for the Trimmy menu-bar actions.

## Development

```sh
npm install
npm test
npm run dev
```

`npm run dev` imports the extension into Raycast. Search for `Paste Trimmed` in root search.

Before a Store PR:

```sh
npm test
npm run lint
npm run build
```

Then `npm run publish`.

## Credits and license

This is an **unofficial** community port. Peter Steinberger wrote the original Trimmy menu-bar app and CLI ([steipete/Trimmy](https://github.com/steipete/Trimmy), MIT).

Ported from that project:

- command-detection and flattening heuristics (`TextCleaner`)
- URL query keep-param rules
- hard-wrapped markdown reflow
- the scissors icon

Added here:

- Raycast commands and preferences
- Render Markdown (formatted preview and paste)

Both works are MIT. The `LICENSE` file keeps both copyright notices, as the MIT license requires. The original notice is in [steipete/Trimmy/LICENSE](https://github.com/steipete/Trimmy/blob/main/LICENSE).

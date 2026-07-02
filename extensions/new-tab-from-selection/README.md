# New Tab from Selection

Open whatever you have **selected** in a **new browser tab**. If the selection is a URL it opens directly;
otherwise it's searched with your chosen engine — the same default behavior as typing into a new tab. A
fast, keyboard-driven way to act on selected text from any app without leaving your flow.

## Commands

- **New Tab from Selection** — grabs the highlighted text in the frontmost app and opens it in a new tab
  (opens a URL directly, or searches it otherwise).
- **New Tab from Clipboard** — same, sourced from the clipboard instead of the selection.
- **New Tab from Selection + Text** — opens the selection plus extra terms you type. Run it, press **Tab**
  to focus the box, add terms, Enter (e.g. select `raycast api`, add `getSelectedText`, open both).
  Leave the box empty to just use the selection.

## Preferences

- **Search Engine** — DuckDuckGo (default), Google, Brave, Bing, Kagi, Startpage, or **Custom**. Used when
  the selection is not a URL.
- **Custom Search Template** — used when the engine is *Custom*. Any URL containing `{query}`, e.g.
  `https://www.perplexity.ai/search?q={query}` or `https://github.com/search?q={query}`. Falls back to
  DuckDuckGo if left blank or missing `{query}`.
- **Browser** — which browser to open the tab in. Defaults to your system default browser.
- **URL Handling** — when the selection is itself a URL (e.g. `github.com/raycast/extensions`), open it
  directly instead of searching. On by default.

## Notes

- Uses Raycast's native selected-text API — no clipboard is overwritten and no fake ⌘C is sent.
- Reading the selection needs Accessibility permission for Raycast (macOS grants this on first use).
- For opening *many* links at once, use the companion **Open Multiple Links** extension instead — this
  one is deliberately single-target.

## Tip: bind a hotkey

Assign a global hotkey to **New Tab from Selection** in Raycast (Extensions → New Tab from Selection) for
an instant "select → new tab" gesture from anywhere.

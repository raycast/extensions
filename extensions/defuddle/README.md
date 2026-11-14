<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="defuddle" width="100"/>
    <h3>defuddle</h3>
    <p>Extract clean Markdown from web pages</p>
    <br/>
    <br/>
</div>

Defuddle is a Raycast extension that turns web pages into readable Markdown and keeps a lightweight local history so you can quickly revisit, copy, or export previous results.

## Highlights

- Fast extraction from typed URLs, selected text, or clipboard URLs, plus active browser tabs on macOS
- Dedicated recent history command for browsing and managing saved results
- Metadata toggle in detail view for a cleaner reading experience
- Broken image filtering and inline SVG cleanup to avoid noisy output
- One-click save to `~/Downloads` for local Markdown files

## Usage

1. Run **Get Markdown**.
2. Paste a URL in the search bar.
3. Select a URL or an **Extract from Active Browser Tab** suggestion.
4. Press Return to extract and open the Markdown detail view.

From extracted pages or recent history you can:

- View Markdown in Raycast
- Copy Markdown to the clipboard
- Save Markdown to `~/Downloads`
- Re-open the source URL
- Remove individual history items or clear history

## Active Browser Tabs

On macOS, install the [Raycast Browser Extension](https://www.raycast.com/browser-extension) to see active-tab suggestions in **Get Markdown**. Each active HTTP or HTTPS tab is listed when multiple browser windows are open. Duplicate URLs and internal browser pages are omitted. If the browser extension is unavailable or there is no active tab, use a typed, selected, or clipboard URL. Browser suggestions are unavailable on Windows; the other inputs continue to work.

Extraction fetches the URL directly, so pages requiring browser login or JavaScript may not return the content you see in the tab.

## Raycast AI Tool

Mention **Defuddle** in Raycast AI and ask, for example, “Read https://example.com/article and summarize its main points.” The **Extract Markdown** tool returns readable Markdown, the source URL, title, and available author/domain/word-count metadata. Supply a complete HTTP or HTTPS URL without embedded credentials. The tool does not add to Recent Markdown, change the clipboard, or create files.

## Timeouts and Cancellation

Each extraction has a 30-second deadline covering the page request, response body, and image checks. A timeout displays an error and you can try again. Leaving an extraction detail view cancels its network requests and prevents an unfinished extraction from being saved to history. Reopening the page starts a fresh request. AI tool requests also use the deadline; the installed Raycast tool API does not expose a cancellation signal to the tool.

## Commands

| Command         | Purpose                                              | Typical Use                                                     |
| --------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| Get Markdown    | Extract Markdown from a URL and open the detail view | Quick one-off extraction from typed, selected, or clipboard URL |
| Recent Markdown | Browse and manage saved extraction history           | Reopen old results, copy, save, or clean up history             |

## Keyboard Shortcuts (Core Actions)

| Action                     | macOS                     | Windows                    |
| -------------------------- | ------------------------- | -------------------------- |
| Extract and View Markdown  | `Cmd + E`                 | `Ctrl + E`                 |
| Copy Markdown              | `Cmd + C`                 | `Ctrl + C`                 |
| Save Markdown to Downloads | `Cmd + S`                 | `Ctrl + S`                 |
| Open Source in Browser     | `Cmd + O`                 | `Ctrl + O`                 |
| Toggle Details Sidebar     | `Cmd + D`                 | `Ctrl + D`                 |
| Remove from History        | `Cmd + Backspace`         | `Ctrl + Backspace`         |
| Clear History              | `Cmd + Shift + Backspace` | `Ctrl + Shift + Backspace` |

## Roadmap

| Status    | Item                                       | Notes                                                |
| --------- | ------------------------------------------ | ---------------------------------------------------- |
| Planned   | Add optional filename prompt before saving | Allow custom export names and destination            |
| Planned   | Add pinned/favorite history items          | Keep important pages at the top                      |
| Planned   | Add markdown post-processing presets       | Examples: trim frontmatter, normalize heading levels |
| Planned   | Add retry + fallback extraction profile    | Improve reliability on heavy or script-heavy pages   |
| Exploring | Add "open in editor" action                | Directly open saved Markdown in preferred editor     |

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm test
npm run lint
npm run build
npx tsc --noEmit
```

# Web to Markdown

Convert any webpage to clean Markdown — save to a file, copy to the clipboard, or preview right inside Raycast. Works with your active browser tab or any URL you provide.

## Commands

| Command | Description |
|---|---|
| **Save Tab to File** | Convert the active browser tab to Markdown and save it to your output directory |
| **Copy Tab to Clipboard** | Convert the active browser tab to Markdown and copy it to the clipboard |
| **Save URL to File** | Convert a URL to Markdown and save it to your output directory |
| **Copy URL to Clipboard** | Convert a URL to Markdown and copy it to the clipboard |
| **Display Tab as Markdown** | Preview the active browser tab as Markdown inside Raycast, then save or copy |
| **Display URL as Markdown** | Preview any URL as Markdown inside Raycast, then save or copy |

Tab commands require the Raycast Browser Extension. URL commands fall back to the clipboard if no URL is provided.

## Preferences

| Preference | Description |
|---|---|
| **Output Directory** | Where to save generated `.md` files (default: `~/Downloads`) |
| **Filename Style** | `Title Slug` or `Date + Title Slug` |
| **Frontmatter** | Add the page title and author to the frontmatter. The source URL and saved date are always written |
| **External Fallback** | If local extraction fails, send the URL to a third-party reader service as a fallback |
| **External Fallback Prefix** | The prefix the page URL is appended to (e.g. `https://r.jina.ai/`) |

## How it works

Tab commands read the page's already-rendered HTML from the Raycast Browser Extension, so pages behind a login and pages rendered client-side convert correctly. URL commands fetch the page directly (20s timeout, 20 MB cap).

Content is extracted locally using [Mozilla Readability](https://github.com/mozilla/readability) and converted to Markdown via [Turndown](https://github.com/mixmark-io/turndown). No data leaves your machine unless the external fallback is explicitly enabled.

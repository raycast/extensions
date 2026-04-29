# Web to Markdown

Convert any webpage to clean Markdown — save to a file, copy to the clipboard, or preview right inside Raycast. Works with your active browser tab or any URL you provide.

## Commands

| Command | Description |
|---|---|
| **Save tab to file** | Convert the active browser tab to Markdown and save it to your output directory |
| **Copy tab to clipboard** | Convert the active browser tab to Markdown and copy it to the clipboard |
| **Save URL to file** | Convert a URL to Markdown and save it to your output directory |
| **Copy URL to clipboard** | Convert a URL to Markdown and copy it to the clipboard |
| **Display tab as .md** | Preview the active browser tab as Markdown inside Raycast, then save or copy |
| **Display URL as .md** | Preview any URL as Markdown inside Raycast, then save or copy |

Tab commands require the Raycast Browser Extension. URL commands fall back to the clipboard if no URL is provided.

## Preferences

| Preference | Description |
|---|---|
| **Output Directory** | Where to save generated `.md` files (default: `~/Downloads`) |
| **Filename Style** | `Title Slug` or `Date + Title Slug` |
| **Frontmatter** | Optionally prepend YAML frontmatter with title, source URL, and saved date |
| **External Fallback** | If local extraction fails, send the URL to a third-party reader service as a fallback |
| **External Fallback Prefix** | The URL prefix for the fallback service (e.g. `https://r.jina.ai/https://`) |

## How it works

Content is extracted locally using [Mozilla Readability](https://github.com/mozilla/readability) and converted to Markdown via [Turndown](https://github.com/mixmark-io/turndown). No data leaves your machine unless the external fallback is explicitly enabled.

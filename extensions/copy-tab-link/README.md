# Copy Tab Link

Copy the browser tab you are looking at as a link someone else can actually click.

The rich text command puts a real formatted link on the clipboard, so pasting into Microsoft Teams,
Outlook, Word, Notes or any other rich text field gives you the page title as clickable text instead of a
wall of URL. Everything else is there too: Markdown, HTML, Slack, Jira, AsciiDoc, Org, LaTeX and your own
template.

## Commands

| Command | What it does |
| --- | --- |
| Copy Tab as Rich Text Link | Formatted, clickable link for Teams, Outlook, Word |
| Paste Tab as Rich Text Link | The same, pasted straight into the field you were typing in |
| Copy Tab as Markdown Link | `[Title](URL)` |
| Copy Tab as Plain Text | Bare URL, title, or `Title — URL`, whichever you configured |
| Copy Tab in Custom Format | Your own template |
| Copy Tab As… | A list of every format with a live preview |
| Copy All Tabs | Every tab of the front window as a list |

## Formats

Rich text, Markdown, HTML, URL, Title, Title and URL, Slack, Jira, Confluence, MediaWiki, AsciiDoc,
reStructuredText, Org Mode, BBCode, Textile, LaTeX and a custom template.

The custom template understands `{title}` `{url}` `{host}` `{domain}` `{path}` `{scheme}` `{markdown}`
`{html}` `{date}` `{time}`, so `{date} · {title}` `{url}` or `- [ ] {markdown}` are all one preference away.

### How the rich text reaches the clipboard

Apps disagree about what a formatted link looks like. Microsoft Teams, Outlook and Word want RTF and
ignore a bare `<a href>`; browsers and Notion want HTML; a plain text field wants neither.

By default the extension puts **all three on the clipboard at once** — RTF, HTML and a plain text
alternative — so every app picks the flavour it understands. The plain text alternative is
configurable: the URL, the title, both, or the Markdown link.

If one app still refuses the link, switch **Rich Text Method** to `RTF only`, which is the route that
has always worked for Teams, Outlook and Word.

## Cleanup

Tracking parameters are removed by default (`utm_*`, `fbclid`, `gclid`, `si`, `ref_src` and a long list
more, all editable). Optionally the fragment goes too.

Titles can be tidied up as well: drop a trailing site name like `… | Example Corp`, remove emoji, cut the
title to a maximum length, or run your own regular expressions over it. Multiple patterns are separated by
`;;`, for example `\s*[-|] Google Docs$;;^\(\d+\)\s*` to remove the Google Docs suffix and the unread
counter some sites put in front of the title.

## Browsers

On macOS the extension talks to the frontmost browser through AppleScript, so nothing extra needs to be
installed: Arc, Dia, Chrome, Chromium, Brave, Edge, Vivaldi, Opera, Safari, Orion, Sidekick, Comet, Helium,
Shift, Wavebox, Whale and Yandex, including their beta and canary builds.

Firefox and Zen do not expose their tabs to AppleScript. For those, install the
[Raycast browser extension](https://www.raycast.com/browser-extension) — the extension falls back to it
automatically. You can also pin one specific browser in the preferences instead of following whichever app
is in front.

## Privacy

Everything happens locally. No URL or page title ever leaves your machine.

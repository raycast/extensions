# Secret Browser Commands

<div align="center">
  <a href="https://github.com/chrismessina">
    <img src="https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social" alt="Follow @chrismessina">
  </a>
  <a href="https://github.com/chrismessina/raycast-secret-browser-commands/stargazers">
    <img src="https://img.shields.io/github/stars/chrismessina/raycast-secret-browser-commands?style=social" alt="Stars">
  </a>
  <a href="https://www.raycast.com/chrismessina/secret-browser-commands">
    <img src="https://img.shields.io/badge/Raycast-Store-red.svg" alt="Secret Browser Commands on Raycast store.">
  </a>
</div>

Quickly access the hidden internal commands of Chromium-based browsers (like `chrome://`, `edge://`, etc.).

Not every command is supported by every browser.

## Compatible Browsers

This extension supports the following Chromium-based browsers:

| Browser          | Scheme       | Version censused       |
| ---------------- | ------------ | ---------------------- |
| Arc              | `arc://`     | 1.161.1 (Chromium 152) |
| Brave            | `brave://`   | 152.1.94.121           |
| Dia              | `dia://`     | 1.48.0 (Chromium 152)  |
| Google Chrome    | `chrome://`  | 152.0.7977.83          |
| Microsoft Edge   | `edge://`    | 152.0.4191.66          |
| Opera            | `opera://`   | 135.0 (Chromium 151)   |
| Perplexity Comet | `comet://`   | 145.2.7632.5934        |
| Vivaldi          | `vivaldi://` | 8.2.4133.47            |

Each browser uses its own URL scheme to access internal pages, though they share many common paths due to their Chromium foundation.

ChatGPT Atlas was dropped in 1.2.0. It is no longer a going concern, and its commands could not be verified.

## Features

**Finding a command**

- Search 307 internal commands by name, URL, or description.
- Pick a browser from the dropdown to see only the commands it actually serves — including vendor-only
  pages like `brave://wallet`, `opera://mods`, `comet://perplexity-spotlight`, `arc://boost` and
  `dia://native-bookmarks`.
- Star the ones you reach for; they sort to the top.
- Browsers you have installed show their real application icon; the rest show a muted globe, so you can see at a glance which is which.

**Knowing what you're looking at**

Each command carries what the census found out about it, so a click that was never going to work is
labelled before you make it:

| Tag           | Meaning                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| **Removed**   | Advertised by no browser we checked, and dead on navigation. Kept searchable, with a note on what replaced it. |
| **Flag**      | Real, but gated behind a Chromium feature. The detail pane names the flag to enable.                           |
| **Don't Use** | Chrome lists the URL but will not load it in a tab. ⌘⇧H hides these.                                           |

Internal debugging pages also say what to switch on before they will load.

**Opening it**

- Open in the selected browser, or any other installed browser that serves that URL.
- Debug commands — `chrome://crash`, `chrome://hang` and the rest — ask for confirmation first,
  from every route that can launch one.
- Crash, untrusted, and removed commands are hidden by default; three preferences reveal them.

**Keyboard**

macOS shortcuts shown — on Windows use `Ctrl` wherever `⌘` appears. Opening and rechecking are
macOS-only, so those two rows do not apply there (see [Windows](#windows)).

|       |                                                                      |
| ----- | -------------------------------------------------------------------- |
| `↵`   | Open in the selected browser (Copy URL when opening isn't available) |
| `⌘⇧C` | Copy URL                                                             |
| `⌘.`  | Star / unstar                                                        |
| `⌘⇧D` | Toggle the detail sidebar                                            |
| `⌘⇧H` | Hide or show unusable commands                                       |
| `⌘R`  | Recheck which browsers are installed                                 |

## Windows

The extension is a reference on Windows. Every URL, description and compatibility note is there, and
Copy URL is the primary action — but launching a browser is macOS only, because it shells out to
macOS `open`. Rather than offer actions that always fail, Windows hides them; the detail pane says so.

## How the browser compatibility is determined

Every browser's own `chrome://chrome-urls` page (with _Internal debugging pages_ enabled) was
scraped over the DevTools Protocol on 2026-09-09, and each browser's list became that browser's
support set.

Six commands are not advertised by any browser and so could not be measured that way. Four were
verified by navigating to them in each browser individually; two are Windows/Linux-only and could not
be verified on macOS at all, so their support is narrowed to what Chromium's own source declares.
Which is which, and which browsers went unverified, is recorded in
[docs/paths.md](docs/paths.md#entries-not-derived-from-the-census) — a support set is a claim, and
the ones that were not measured say so.

Every URL was then navigated to in Chrome 152 to separate three cases that a listing alone
cannot tell apart: pages that open, pages that no longer exist, and the 22 pages Chrome
advertises but will not load in a tab.

## ⚠️ Important Warnings

### Crash Commands

This extension includes **crash commands** that are intended exclusively for browser developers testing crash reporting and stability. These commands can:

- **Crash your browser** immediately (e.g., `chrome://crash`, `chrome://gpucrash`)
- **Hang your browser** indefinitely (e.g., `chrome://hang`, `chrome://gpuhang`)
- **Terminate browser processes** (e.g., `chrome://kill`, `chrome://quit`)
- **Cause data loss** if you have unsaved work

**These commands are hidden by default** behind the _Hide Crash Commands_ preference, and running one asks for confirmation first. Only enable them if you are a developer who understands their purpose and accepts the risks.

Chromium lists these separately from _Internal Debugging Page URLs_ — pages like `chrome://actor-internals` and `chrome://omnibox`, which are harmless diagnostics that simply need **Enable internal debugging pages** turned on at `chrome://chrome-urls` first. This extension keeps that distinction: the preference above hides only the ones that crash the browser.

### Chrome-Untrusted Commands

The extension also includes **chrome-untrusted://** commands, which run in isolated security contexts with restricted privileges. These:

- Are designed for internal browser features that handle untrusted content
- Run in heavily sandboxed environments separate from normal browser pages
- **May cause unexpected behavior, errors, or crashes** when accessed directly
- Are not intended for direct user interaction

Examples include `chrome-untrusted://compose`, `chrome-untrusted://print`, and `chrome-untrusted://lens-overlay`.

**These commands are also hidden by default.** Only enable them if you understand the security implications and are troubleshooting specific browser features.

## Sources

The commands in this extension come from, in order of authority:

- Each browser's own `chrome://chrome-urls` page — the authoritative, per-build list, and the primary source since 1.2.0
- [webui_url_constants.cc](https://source.chromium.org/chromium/chromium/src/+/main:chrome/common/webui_url_constants.cc) - `ChromeURLHosts()` and `ChromeDebugURLs()`, the arrays that generate that page
- [chrome_url_data_manager_browsertest.cc](https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/ui/webui/chrome_url_data_manager_browsertest.cc) - internal Chrome URLs exercised by tests

They provide access to internal browser pages for debugging, diagnostics, configuration, and feature management. Vendor-specific pages (Brave, Opera, Edge, Comet, Arc, Dia) do not appear in Chromium source at all and come only from the live census.

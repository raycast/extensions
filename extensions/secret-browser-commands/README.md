# Secret Browser Commands

Quickly access hidden internal URLs for Chromium-based browsers (like `chrome://`, `edge://`, etc.).

Note that not all URLs are supported by all browsers.

## Compatible Browsers

This extension supports the following Chromium-based browsers:

* **Arc** - `arc://`
* **Brave** - `brave://`
* **ChatGPT Atlas** - `atlas://` (uses `chrome://` internally)
* **Google Chrome** - `chrome://`
* **Dia** - `dia://`
* **Microsoft Edge** - `edge://`
* **Opera** - `opera://`
* **Perplexity Comet** - `browser://` (uses `chrome://` internally)
* **Vivaldi** - `vivaldi://`

Each browser uses its own URL scheme to access internal pages, though they share many common paths due to their Chromium foundation.

## Features

* Search and filter a comprehensive list of secret browser URLs.
* Open URLs in any supported Chromium browser.
* Access debugging tools, internal settings, and diagnostic pages.
* View browser-specific features and configurations.
* Filter debug and untrusted URLs via preferences (both hidden by default).

## ⚠️ Important Warnings

### Debug URLs

This extension includes **debug commands** that are intended exclusively for browser developers testing crash reporting and stability. These commands can:

* **Crash your browser** immediately (e.g., `chrome://crash`, `chrome://gpucrash`)
* **Hang your browser** indefinitely (e.g., `chrome://hang`, `chrome://gpuhang`)
* **Terminate browser processes** (e.g., `chrome://kill`, `chrome://quit`)
* **Cause data loss** if you have unsaved work

**These URLs are hidden by default.** Only enable them in preferences if you are a developer who understands their purpose and accepts the risks.

### Chrome-Untrusted URLs

The extension also includes **chrome-untrusted://** URLs, which run in isolated security contexts with restricted privileges. These URLs:

* Are designed for internal browser features that handle untrusted content
* Run in heavily sandboxed environments separate from normal browser pages
* **May cause unexpected behavior, errors, or crashes** when accessed directly
* Are not intended for direct user interaction

Examples include `chrome-untrusted://compose`, `chrome-untrusted://print`, and `chrome-untrusted://privacy-sandbox-dialog`.

**These URLs are also hidden by default.** Only enable them if you understand the security implications and are troubleshooting specific browser features.

## Sources

The secret browser URLs in this extension are derived from official Chromium source code, specifically:

* [chrome_url_data_manager_browsertest.cc](https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/ui/webui/chrome_url_data_manager_browsertest.cc) - Comprehensive list of internal Chrome URLs used for testing
* Official Chromium documentation and source code

These URLs provide access to internal browser pages for debugging, diagnostics, configuration, and feature management. While most URLs work across all Chromium-based browsers, some may be browser-specific or platform-dependent.

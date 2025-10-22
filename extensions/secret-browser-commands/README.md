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
* Open URLs in your preferred browser (set in preferences) or other supported Chromium browsers.
* Access debugging tools, internal settings, and diagnostic pages.
* View browser-specific features and configurations.

## Setup

1. Go to the extension preferences.
2. Select your "Preferred Browser".

## Sources

The secret browser URLs in this extension are derived from official Chromium source code, specifically:

* [chrome_url_data_manager_browsertest.cc](https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/ui/webui/chrome_url_data_manager_browsertest.cc) - Comprehensive list of internal Chrome URLs used for testing
* Official Chromium documentation and source code

These URLs provide access to internal browser pages for debugging, diagnostics, configuration, and feature management. While most URLs work across all Chromium-based browsers, some may be browser-specific or platform-dependent.

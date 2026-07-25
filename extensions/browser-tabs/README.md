# Browser Tabs

Search and open tabs in Chrome, Safari, Edge, Arc, Brave, Vivaldi, Opera and Orion, etc.

## Supported Browsers

- **Safari** (WebKit-based)
- **Chrome** (Chromium-based)
- **Edge** (Chromium-based)
- **Arc** (Chromium-based)
- Other Chromium or WebKit-based browsers

## Unsupported Browsers

- **Firefox** (Gecko-based)
- **Zen Browser** (Gecko-based)
- Other Gecko-based browsers are not supported.

## Windows

On Windows, the extension reads your tabs through the [Raycast Browser Extension](https://www.raycast.com/browser-extension), so install it in your browser first. A few things work differently than on macOS:

- Raycast talks to one browser at a time. If the extension is installed in several browsers, you'll see tabs from the one you used last.
- Tabs aren't grouped per browser, since the Browser Extension doesn't say which browser a tab came from.
- Jumping to or closing a tab works through Windows UI Automation and matches the tab by its title. If two tabs share the exact same title, the first one wins.

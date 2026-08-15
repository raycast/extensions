# Aside

Control the [Aside browser](https://www.aside.com/) from Raycast. Search open tabs and saved bookmarks, open URLs or searches, and manage tabs without leaving the keyboard.

## Commands

- **Search Tabs** — Search every normal and incognito window, then focus, reload, close, or copy a tab.
- **Open URL or Search Query** — Open a URL or search with your preferred engine.
- **Open New Tab** — Create a blank tab in the front Aside window.
- **Open New Window** — Create a normal browser window.
- **Open New Incognito Window** — Create a private browser window.
- **Focus Tab** — Search for and select an existing tab.
- **Close Tab** — Search for and close a tab.
- **Reload Tab** — Search for and reload a tab.
- **Copy Tab URL** — Search for a tab and copy its current URL.
- **Search Bookmarks** — Search bookmarks from the bookmarks bar and other bookmark folders.

## Raycast AI

Mention `@aside` in Raycast AI to use the same deterministic browser controls conversationally. Raycast can compose tools to find tabs, open URLs or searches, select or reload tabs, copy URLs, search bookmarks, and open normal or incognito windows. Closing one or more tabs always shows a destructive-action confirmation before anything is changed.

Aside's current AppleScript dictionary does not expose spaces or profiles. Requests such as “open this in my Personal space” can open the tab, but cannot reliably choose that space. Page-content reading and summarization are also intentionally unsupported for now.

## Requirements

- macOS 12 or later
- [Raycast](https://www.raycast.com/)
- Aside with AppleScript support (tested with Aside 1.0.728.1 through 1.0.813.1)

## Automation permission

The first command that controls Aside may ask permission for Raycast to automate Aside. Choose **Allow**.

If you denied the prompt, open **System Settings → Privacy & Security → Automation**, expand **Raycast**, and enable **Aside**. The extension provides an action that opens this settings page when permission is missing.

## Search engine

The extension recognizes full URLs, bare domains, localhost addresses, and other explicit URL schemes. Everything else uses the search engine selected in the extension preferences: Google, DuckDuckGo, Kagi, Brave Search, or Bing.

## Privacy

Browser control uses Aside's public AppleScript dictionary. The extension does not read Aside's private history, downloads, cookies, profile databases, or page contents. Regular commands process tab and bookmark information locally on your Mac.

When you explicitly use an `@aside` Raycast AI tool, the matching tab titles, URLs, bookmark names, and folder paths returned by that tool can become part of the Raycast AI conversation context. The tools default to bounded results, and Raycast AI is instructed to use narrow searches and the smallest practical result set. The extension does not launch the Aside CLI or send browser data to a separate Aside service.

## Troubleshooting

- **No tabs appear:** Aside will be launched and given a usable window automatically. Use the refresh action if the browser was still starting.
- **A tab disappeared:** The extension validates both the native window ID and tab ID before changing a tab. Refresh the list after a stale-tab error.
- **Automation fails:** Re-enable Raycast → Aside under macOS Automation privacy settings.
- **After an Aside update:** Run the smoke-test checklist in [`docs/TESTING.md`](docs/TESTING.md) before relying on destructive tab actions.
- **Compatibility notice:** Versions other than the version listed under Requirements show a non-blocking warning. Commands remain available so harmless Aside updates do not lock you out.

## Development

```bash
npm install
npm test
npm run lint
npm run build
```

This project is licensed under the MIT License.

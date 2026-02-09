# Instants

Search and play sound clips from [MyInstants.com](https://www.myinstants.com) directly from Raycast.

## Commands

| Command                         | Description                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Search Instants**             | Search for sound clips on MyInstants. Type to search; results are cached.                                       |
| **Favorite Instants**           | View and play your favorite sounds.                                                                             |
| **Trending Instants**           | Browse trending sounds on MyInstants.                                                                           |
| **Play Favorite**               | Play a favorite by number (1-based). Accepts a number argument; supports [deep link](#play-favorite-deep-link). |
| **Favorite 1** … **Favorite 8** | Play your 1st–8th favorite sound (brief view then closes).                                                      |

## Actions & Shortcuts

When a sound is selected, you can:

- **Play Sound** — Play the clip (primary action; press Enter).
- **Stop Sound** — Stop playback (no shortcut; use the action panel).
- **Add to Favorites** / **Remove from Favorites** — Pin: `⌘⇧P`, Remove: `⌃X`.
- **Copy Name** — Copy the sound name to the clipboard (`⌘⇧.`).
- **Copy URL** — Copy the page URL (`⌘⇧C`).
- **Open in Browser** — Open the MyInstants page (`⌘O`).
- **Refresh** (Trending) — Reload trending list (`⌘R`).
- **Download Sound** (Search) — Open the sound file URL to download (`⌘⇧D`).

## Play Favorite deep link

Trigger **Play Favorite** from outside Raycast (Shortcuts, Automator, browser, or any app that opens URLs).

### URL format

```
raycast://extensions/0xdhrv/instants/play-favorite?arguments=<URL-encoded-JSON>
```

The `arguments` value must be URL-encoded JSON. For example, to play favorite **1**:

| JSON (decoded)   | URL-encoded (`arguments` value) |
| ---------------- | ------------------------------- |
| `{"number":"1"}` | `%7B%22number%22%3A%221%22%7D`  |
| `{"number":"2"}` | `%7B%22number%22%3A%222%22%7D`  |
| `{"number":"3"}` | `%7B%22number%22%3A%223%22%7D`  |

**Full URL to play favorite 1:**

```
raycast://extensions/0xdhrv/instants/play-favorite?arguments=%7B%22number%22%3A%221%22%7D
```

### How to get your deep link

1. In Raycast, run **Play Favorite**.
2. Enter a number (e.g. `1`) in the argument field.
3. Open the action panel (e.g. ⌘K or right-click).
4. Choose **Copy Deeplink** (⌘⇧C).
5. The copied URL includes the correct extension path and the number you entered. Use it in Shortcuts, browser bookmarks, or automation.

### Example: macOS Shortcuts

1. New Shortcut → **Open URL**.
2. Paste the deep link (e.g. for favorite 1).
3. Optionally assign a keyboard shortcut or add to Menu Bar.

## Preferences

- **Cache Duration (minutes)** — How long to cache search and trending results (default: 60).
- **Download when adding to favorites** — When enabled (default), the sound file is downloaded to your device when you add it to favorites. Playback then uses the local file (faster, works offline). Disable to stream from the URL when playing favorites.

Configure in Raycast → Extensions → Instants → Preferences.

## Platform support

- **macOS**: Playback uses `afplay`; Favorite 1–8 use background playback so the window closes immediately.
- **Windows**: Playback opens the sound file with the default media app (e.g. Windows Media Player). Stop Sound is not supported on Windows.

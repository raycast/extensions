# CLIP - URL Shortener

A [Raycast](https://raycast.com) extension for shortening URLs with your choice of service. Automatically reads URLs from your clipboard, shortens them in one step, and copies the result back to your clipboard.

Ported from the [alfred-shorturl](https://github.com/benbenbang/alfred-shorturl) Alfred workflow.

---

## Commands

| Command         | Description                                        |
| --------------- | -------------------------------------------------- |
| **Shorten URL** | Pick a service and shorten the active URL          |
| **URL History** | Browse, copy, and manage previously shortened URLs |

---

## Features

- **Clipboard detection** — opens with the URL already populated if your clipboard contains a valid `http(s)` link
- **Five shortening services** — three require no account at all; two offer branded/trackable links with an API key
- **Persistent history** — stores up to 100 entries in Raycast local storage, with per-entry delete and clear-all
- **HUD confirmation** — after shortening, the result is displayed via Raycast HUD and written to your clipboard
- **Graceful degradation** — services missing an API key are shown with a badge and open preferences on action

---

## Supported Services

| Service                        | API Key Required | Notes                                   |
| ------------------------------ | ---------------- | --------------------------------------- |
| [bit.ly](https://bitly.com)    | Yes              | Analytics dashboard, custom back-halves |
| [cutt.ly](https://cutt.ly)     | Yes              | Click tracking, QR codes                |
| [TinyURL](https://tinyurl.com) | No               | No account needed                       |
| [is.gd](https://is.gd)         | No               | No account needed                       |
| [v.gd](https://v.gd)           | No               | Variant of is.gd, no account needed     |

---

## Setup

### Prerequisites

- [Raycast](https://raycast.com) installed
- Node.js 20+

### Local Development

```bash
npm install
npm run dev
```

`npm run dev` launches the extension in Raycast development mode with hot-reload.

### Configuring API Keys

API keys are optional. The three keyless services (TinyURL, is.gd, v.gd) work immediately without any configuration.

To use **bit.ly** or **cutt.ly**, add your key in Raycast:

1. Open Raycast and search for **CLIP**
2. Press `Cmd+,` to open extension preferences (or select "Configure API Key" from any unconfigured service)
3. Paste your key into the corresponding field

| Service | Where to get the key                                               |
| ------- | ------------------------------------------------------------------ |
| bit.ly  | [app.bitly.com/settings/api/](https://app.bitly.com/settings/api/) |
| cutt.ly | [cutt.ly/edit](https://cutt.ly/edit)                               |

---

## Usage

1. Copy a URL to your clipboard
2. Open Raycast and run **Shorten URL** — the URL is pre-filled automatically
3. Select a service from the list
4. The shortened URL is copied to your clipboard and saved to history

To retrieve a past result, run **URL History**. From any history entry you can copy the short URL, copy the original URL, open it in the browser, or delete the entry.

---

## Development

```bash
npm run build      # production build
npm run lint       # ESLint
npm test           # run 55 Vitest unit + integration tests
npm run test:watch # run tests in watch mode
```

---

## License

MIT — see [LICENSE](LICENSE) for details.

**Author:** [benbenbang](https://github.com/benbenbang)

---

## Acknowledgements

Extension icon created by [Freepik - Flaticon](https://www.flaticon.com/free-icons/www).

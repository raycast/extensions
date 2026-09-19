# Whisper - Share Secrets

A Raycast extension to share passwords, API keys, and private notes securely. Whisper creates encrypted links that expire or self-destruct after viewing, powered by the [Whisper](https://whisper.quentinvedrenne.com) service.

## Features

- **Zero-Knowledge Encryption** — Secrets are encrypted on your device (AES-256-GCM) before anything leaves it. The decryption key travels only in the link's `#` fragment, which is never sent to any server — not even Whisper's
- **Quick Whisper** — Type your secret (masked) directly from Raycast and get an encrypted link copied to your clipboard instantly
- **Whisper Selected Text** — Select text in any app, hit a hotkey, and the clipboard holds an encrypted link. Falls back to the clipboard content when nothing is selected
- **Retrieve Secret** — Paste a Whisper link to fetch and decrypt the secret on your device, with a warning before a single-view link is consumed
- **Create Secret Form** — Use a form to compose your secret with fine-grained control over expiration and self-destruct settings
- **Multiple Values Mode** — Share several key/value pairs (with optional sections) as one structured secret, e.g. a set of database credentials
- **Configurable Expiration** — Choose how long the link stays alive: 30 minutes, 1 hour, 24 hours, or 7 days
- **Self-Destruct** — Optionally delete the secret after the first view, ensuring it can only be read once
- **Clipboard-Safe** — Links and revealed secrets are copied as concealed, so they never land in Raycast's Clipboard History. Paste them with `⌘V` right away: by design they cannot be recovered from clipboard history afterwards
- **Your Defaults** — Pick the default expiration and self-destruct behaviour once in preferences; every command and the AI tool follow them
- **Self-Hosted Support** — Point the extension to your own Whisper server instance via preferences (Whisper 1.3 or newer; the extension never sends plaintext to a server that lacks the zero-knowledge endpoint)
- **AI Tool** — Create secret links directly through Raycast AI

## Configuration

When you first run the extension, you can optionally configure a custom Whisper server URL in the extension preferences. By default, it uses the hosted instance at `https://whisper.quentinvedrenne.com`.

| Preference            | Description                                                        | Required | Default                               |
| --------------------- | ------------------------------------------------------------------ | -------- | ------------------------------------- |
| Whisper Server URL   | URL of the Whisper server (for self-hosted instances)              | No       | `https://whisper.quentinvedrenne.com` |
| Default Expiration   | Expiration used by quick commands and the AI tool, and pre-selected in the form | No | `1 Hour`                      |
| Default Self-Destruct | Whether new secrets are deleted after the first view by default     | No       | On                                    |

## Commands

### Whisper (Quick Command)

Create a secret link in one shot. The secret is masked while you type, and the link lands on your clipboard. Expiration and self-destruct come from your preferences — use **Create Secret** when you want to choose them for a single secret.

**Examples:**

- `my-api-key` → encrypted link on the clipboard, using your default expiration and self-destruct
- `correct horse battery staple` → spaces are fine, the whole argument is the secret

### Whisper Selected Text

Select any text in the frontmost app and run the command (assign it a hotkey for the full effect): the selection is encrypted with your default settings and the link replaces it on your clipboard. When nothing is selected, the current clipboard text is used instead.

### Retrieve Secret

Paste a Whisper link (it is pre-filled when your clipboard already holds one). Links to remote servers must use `https://`. The extension checks the link without consuming it, asks for confirmation when the secret is single-view, then fetches the encrypted payload and decrypts it locally with the key from the link's `#k=` fragment. Single secrets open in a detail view with Copy, Show/Hide and Paste actions; Multiple Values secrets open as a list where each value can be copied on its own or all of them as JSON. Values are masked until you choose to show them.

### Create Secret (Form)

A guided form to create a secret with dropdowns for expiration and a checkbox for self-destruct. The encrypted link is automatically copied to your clipboard.

Pick an **Input Mode**:

- **Free Form** — a single text secret (password, API key, note…)
- **Multiple Values** — structured key/value entries, optionally grouped into named sections. Manage entries from the Actions menu (`⌘K` on macOS, `Ctrl+K` on Windows):

  | Action                       | macOS | Windows                |
  | ---------------------------- | ----- | ---------------------- |
  | Add an entry                 | `⌘N`  | `Ctrl+N`               |
  | Remove the last entry        | `⌘⌫`  | `Ctrl+Backspace`       |
  | Add a section                | `⌘⇧N` | `Ctrl+Shift+N`         |
  | Add an entry to last section | `⌘⌥N` | `Ctrl+Alt+N`           |
  | Remove the last section      | `⌘⇧⌫` | `Ctrl+Shift+Backspace` |

Either way the secret is encrypted on your device before upload; the recipient decrypts it in their browser.

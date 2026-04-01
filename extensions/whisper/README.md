# Whisper - Share Secrets

A Raycast extension to share passwords, API keys, and private notes securely. Whisper creates encrypted links that expire or self-destruct after viewing, powered by the [Whisper](https://whisper.quentinvedrenne.com) service.

## Features

- **Quick Whisper** — Type your secret directly from Raycast and get an encrypted link copied to your clipboard instantly
- **Create Secret Form** — Use a form to compose your secret with fine-grained control over expiration and self-destruct settings
- **Configurable Expiration** — Choose how long the link stays alive: 30 minutes, 1 hour, 24 hours, or 7 days
- **Self-Destruct** — Optionally delete the secret after the first view, ensuring it can only be read once
- **Self-Hosted Support** — Point the extension to your own Whisper server instance via preferences
- **AI Tool** — Create secret links directly through Raycast AI

## Configuration

When you first run the extension, you can optionally configure a custom Whisper server URL in the extension preferences. By default, it uses the hosted instance at `https://whisper.quentinvedrenne.com`.

| Preference         | Description                                           | Required | Default                               |
| ------------------ | ----------------------------------------------------- | -------- | ------------------------------------- |
| Whisper Server URL | URL of the Whisper server (for self-hosted instances) | No       | `https://whisper.quentinvedrenne.com` |

## Commands

### Whisper (Quick Command)

Create a secret link in one shot. The format is:

```
<secret> [duration] [self-destruct]
```

- `duration` — `30m`, `1h`, `24h`, `7d` (default: `1h`)
- `self-destruct` — `false` to allow multiple views (default: `true`)

**Examples:**

- `my-api-key` → 1h expiration, self-destructs
- `my-password 24h` → 24h expiration, self-destructs
- `my-note 7d false` → 7 days, viewable multiple times

### Create Secret (Form)

A guided form to create a secret with dropdowns for expiration and a checkbox for self-destruct. The encrypted link is automatically copied to your clipboard.

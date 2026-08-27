# Grok Bot for Raycast

Send a task to a Grok Bot teammate from Raycast.

This extension is unofficial. It is not an xAI, Grok Bot, or Cursor product. It calls the undocumented Sand HTTP gateway on your Grok Bot computer. It is not the Grok chat API at `api.x.ai`.

That gateway can change or disappear without notice. When Grok Bot ships an official API, this extension will likely need a rewrite, or may be replaced. Do not treat the current URL, token, or endpoints as a stable contract.

## Legal

This is not legal advice. Read xAI's [Terms of Service](https://x.ai/legal/terms-of-service) and [Acceptable Use Policy](https://x.ai/legal/acceptable-use-policy) yourself before you use this.

**Unofficial client.** There is no public Grok Bot API for third-party apps. This extension talks to a private Sand gateway that xAI does not document. xAI's AUP restricts reverse engineering and unauthorized automated or non-human access. Using this may violate those terms. xAI or Cursor can suspend or terminate the account that owns the Bot computer.

**Trademarks.** Grok, Grok Bot, and xAI are trademarks of their owners. This repo claims no affiliation or endorsement. Do not ship xAI or Grok Bot branding, icons, or artwork in forks or Store submissions.

**Raycast Store.** Raycast can reject or remove an extension that violates a third-party service's terms. Local **Import Extension** for your own Mac and your own token is separate from Store listing. Store acceptance is not guaranteed.

**What this project will not do.** Do not use Tailscale Funnel. Do not publish someone else's gateway. Do not put a stranger's token in the Store listing, README screenshots, or issues.

## Platforms

This extension is **macOS only**. The manifest sets `"platforms": ["macOS"]`. It does not run on Windows Raycast or on Raycast for iOS.

[Raycast for iOS](https://www.raycast.com/ios) is an **iOS-only** app. There is no Android Raycast. Store extensions like this one do not install on Raycast for iOS. On a phone, use the official **Grok Bot iOS app** (also iOS only), not this Raycast client.

| Surface             | Supported | Why                                                                             |
| ------------------- | --------- | ------------------------------------------------------------------------------- |
| Raycast for Mac     | Yes       | Declared platform. List Bots, Ask Bot, Open Grok Bot, and the AI tool run here. |
| Raycast for Windows | No        | Not in `platforms`. **Open Grok Bot** expects `/Applications/Grok Bot.app`.     |
| Raycast for iOS     | No        | Raycast mobile is iOS only, and it does not load this Store extension.          |
| Android             | No        | No Raycast. No Grok Bot Android client through this project.                    |

You still need Tailscale on the Mac that runs Raycast, and a reachable Sand gateway on the Bot computer. Opening the desktop app from Raycast needs Grok Bot installed under `/Applications` on that Mac (or the `grokbot://` URL handler).

## Install the extension

If Grok Bot is on the Raycast Store, install it from the store. The store lists it under Communication, plus Productivity and Developer Tools. Screenshots for store review live in `metadata/`.

To run this folder, including store review:

1. Clone or unzip the repo.
2. In Raycast, run **Import Extension** and pick the folder.
3. Run `npm install`.
4. Run `npm run dev`.

Set `author` in `package.json` to your Raycast Store username before `npm run publish`.

**List Bots** stays empty until you [connect Raycast to the gateway](#connect-raycast-to-the-gateway). After Tailscale is signed in on this Mac, [ask a teammate to set it up](#ask-a-teammate-to-set-it-up).

## Connect Raycast to the gateway

You need Tailscale on this Mac and on the Grok Bot computer, signed into the same account. The gateway stays on `127.0.0.1` on the Bot computer. Raycast on the Mac reaches it through Tailscale Serve.

Do not run `tailscale funnel`. Funnel publishes the port on the public internet.

### Install Tailscale on this Mac

1. Install [Tailscale](https://tailscale.com/download). Use the macOS app or `brew install --cask tailscale`.
2. Open Tailscale and sign in.
3. Leave Tailscale connected while you use this extension.

Confirm with:

```bash
tailscale status
```

This Mac should show as online. If Tailscale is stopped, **List Bots** cannot reach the Bot computer.

### Ask a teammate to set it up

Paste this into a Grok Bot chat. The teammate signs the Bot computer into the tailnet, publishes Serve, and writes `gateway.env` on this Mac without printing the token.

Do not paste the gateway token into that chat, a log, or a screenshot.

```
Set up Tailscale Serve for the Sand gateway so Raycast on my Mac can reach it.

Do not print the gateway token. Do not write the token into chat, logs, or screenshots. Do not start any fake HTTP listener on my Mac. Do not use tailscale funnel. Do not bind the gateway to 0.0.0.0.

1. On my Mac, run `tailscale status`. If Tailscale is missing or logged out, tell me to install Tailscale, sign in, and send this prompt again. Do not continue until this Mac is online on the tailnet.

2. Read /home/box/sand-data/gateway.json for port and token. Never echo the token. The gateway must stay on 127.0.0.1 on this computer.

3. Install the official Linux Tailscale client if it is missing. Run `tailscale up`. If it prints a login URL, open that URL in this computer's browser, not only on my Mac, and finish login with the same account as my Mac. If you cannot open a browser here, reply with the login URL and wait. I must open it in this computer's browser. Wait until `tailscale status` shows this machine as online. If the tailnet requires approval, tell me to approve this Linux node in the Tailscale admin console.

4. Enable HTTPS certificates if Serve asks. Then persist Serve to the gateway port only, for example:
   `sudo tailscale serve --bg 1340`
   Use the real port from gateway.json. Confirm with `sudo tailscale serve status`. You want an https://…ts.net URL that proxies to http://127.0.0.1:<port>.

5. Using my local computer, create ~/.config/grok-bot-raycast with mode 700 if needed. Rewrite ~/.config/grok-bot-raycast/gateway.env with mode 600 as a regular file, not a symlink, and exactly:
GATEWAY_URL=https://<magicdns-host>
GATEWAY_TOKEN=<existing token>
No trailing slash on the URL. Do not use 127.0.0.1. Do not use funnel.

6. Write ~/.config/grok-bot-raycast/status.txt with mode 644 and no token:
written=yes
url_host=<magicdns host, no scheme>
port=<gateway port>
tailscale=yes
serve=yes

7. Reply with only: written=yes url_host=... port=... tailscale=yes serve=yes
Do not include the token.
```

Then run **List Bots**. If you prefer Raycast preferences over `gateway.env`, copy `url_host` from the reply into **Gateway URL**. Do not ask the teammate to paste the token into chat.

If you want to do the Bot computer steps yourself, use the sections below.

### Sign the Bot computer into the tailnet

1. Read `/home/box/sand-data/gateway.json` for `port` and `token`. Never echo the token. Leave the gateway on `127.0.0.1`.
2. Install the official Linux Tailscale client if it is missing. See [Install Tailscale on Linux](https://tailscale.com/download/linux).
3. Run `tailscale up`. If it prints a login URL, open that URL in the Bot computer's browser, not only on your Mac. Finish login with the same account as this Mac.
4. Wait until `tailscale status` shows the Bot computer as online. In the Tailscale admin console, approve the new Linux node if the tailnet requires it.
5. Enable HTTPS certificates for the tailnet if Serve asks. That is a tailnet setting, not Funnel. See [Enabling HTTPS](https://tailscale.com/kb/1153/enabling-https).

### Publish the gateway with Serve

On the Bot computer, persist Serve to the gateway port from `gateway.json`. The port is usually `1340`:

```bash
sudo tailscale serve --bg 1340
sudo tailscale serve status
```

If your CLI wants an explicit target:

```bash
sudo tailscale serve --bg --https=443 localhost:1340
```

`serve status` should show an HTTPS URL that proxies to `http://127.0.0.1:1340`, for example `https://box.tailxxxxx.ts.net`.

### Set Gateway URL and Gateway Token

Open the Grok Bot extension preferences in Raycast.

| Preference        | Value                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Gateway URL**   | The Serve URL with no trailing slash. Example: `https://box.tailxxxxx.ts.net`. Do not use `http://127.0.0.1:1340`. |
| **Gateway Token** | `token` from `/home/box/sand-data/gateway.json` on the Bot computer. Treat it like a password.                     |

If both preferences are set, Raycast uses them. If either is empty, the extension reads `~/.config/grok-bot-raycast/gateway.env` instead.

The token can change when the Bot computer restarts. When **List Bots** shows **Gateway token rejected**, update the preference or rewrite `gateway.env`.

Create `~/.config/grok-bot-raycast` with mode `700`. Write `~/.config/grok-bot-raycast/gateway.env` with mode `600`. The file must be a regular file, not a symlink. It must not be group or world readable.

```
GATEWAY_URL=https://box.tailxxxxx.ts.net
GATEWAY_TOKEN=the-token-from-gateway-json
```

Accepted URL keys: `GATEWAY_URL`, `GROKBOT_GATEWAY_URL`, `SAND_GATEWAY_URL`.

Accepted token keys: `GATEWAY_TOKEN`, `SAND_GATEWAY_TOKEN`.

Do not put the token in any other file. If a teammate writes `status.txt` next to `gateway.env`, that file may record the hostname and port only. This extension does not read `status.txt`.

If `gateway.env` is a symlink, or is group or world readable, the extension refuses it. **List Bots** shows **Can't use gateway.env**. Fix the file mode, replace a symlink with a regular file, or set the preferences instead.

## Confirm that List Bots works

From this Mac, with Tailscale connected:

```bash
curl -sS https://box.tailxxxxx.ts.net/health
```

You want JSON with `"ok": true`. That call does not use the token.

Then run **List Bots**. The first load can take about a minute. The gateway inlines large avatar images. This extension streams the body, decodes each avatar onto disk without keeping the original in memory, and writes 128px JPEG thumbnails under the extension support directory for list icons. Letter icons remain when resize fails. Later opens reuse the thumbnail files and a cached slim roster. Names can appear before the download finishes.

If `/health` works and **List Bots** does not, confirm **Gateway URL** has no trailing slash and the token matches `gateway.json`.

Without a URL and token, **List Bots** and **Ask Bot** still offer **Open Grok Bot**.

## Fix a failed List Bots

Match the empty-state title.

**Can't reach your bots**, and the action is **Open Preferences**. Set **Gateway URL** and **Gateway Token**, or add a valid `gateway.env`. A listener on this Mac at `:1340` is not the gateway.

**Can't reach your bots**, and the action is **Retry**. Start Tailscale on this Mac. Confirm `tailscale status` shows this Mac and the Bot computer as online. Confirm Serve is still published: `sudo tailscale serve status` on the Bot computer.

**Can't use gateway.env**. The file is a symlink, not a regular file, or is group or world readable. `chmod 600` the file, replace a symlink with a regular file, or set the preferences instead.

**Gateway token rejected**. Copy `token` from `gateway.json` again. The token can change after the Bot computer restarts.

**Couldn't load bots**. The Serve URL reached something that is not a valid gateway response. Confirm the URL is the `https://…ts.net` host from `serve status`, with no trailing slash.

Do not bind the Sand gateway to `0.0.0.0`. Do not point **Gateway URL** at `127.0.0.1` on the Mac. Do not start a dummy HTTP server on the Mac. Do not commit `gateway.env` or paste the token into GitHub.

## Send a task

- **List Bots.** Search teammates and send a task.
- **Ask Bot.** Send a task to one bot. Uses selected text if you do not pass a question.
- **Open Grok Bot.** Opens the desktop app.

Raycast AI can call **List Bots**, then **Send to Bot**, once the teammate is unique.

## Why Raycast uses Tailscale Serve

The Sand gateway listens on loopback on the Bot computer, usually `http://127.0.0.1:1340`. Port and token live in `/home/box/sand-data/gateway.json` on that computer.

Raycast cannot use the Grok Bot app's own tunnel. That tunnel is private to the desktop app. The Bot computer can ask this Mac to run commands. That local-exec path does not open HTTP from the Mac into the Bot computer.

Raycast is only a client. You give it a URL and a token. Serve puts HTTPS on your tailnet and still proxies to loopback on the Bot computer. Funnel would put that same port on the public internet. A process on this Mac bound to `:1340` is not the Sand gateway.

## Develop the extension

You need Node 22 or newer.

```bash
npm test
npm run lint
npm run build
```

`npm run lint:store` runs `ray lint`. That command and `npm run publish` need a Raycast Store username in `author`. This repo is importable without one.

See [Contributing](CONTRIBUTING.md) for pull request checks.

## License

MIT for this extension's source code. See [Legal](#legal) for trademarks, xAI terms risk, and Store caveats. Grok Bot is a trademark of xAI. This repo is not affiliated with xAI, Grok Bot, or Cursor.

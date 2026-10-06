# Atomberg for Raycast

Control your Atomberg smart fans from Raycast — power, speed, sleep mode, light and timer —
either from the command palette or from a menu bar item.

Built on [Atomberg's developer API](https://developer.atomberg-iot.com/). No account beyond
the one you already use in the Atomberg Home app.

## Features

- **Full fan control** — power, speed 1–6, sleep mode, light and timer.
- **Click or type** — click the speed tags in the detail pane, pick from the dropdown, or use
  `⌘1`–`⌘6`.
- **Menu bar item** — a fan icon with a section per fan, for control without opening Raycast.
- **Frugal with the API** — Atomberg allows roughly 100 calls a day, so the access token and
  device list are cached, commands update the UI optimistically, and nothing is re-fetched
  after a command.
- **Credentials stay in the keychain** — stored as Raycast password preferences, never written
  to disk by the extension.

## Requirements

A Wi-Fi "Smart+" / IoT Atomberg fan. If **Developer Options** doesn't appear in the Atomberg
Home app, your fan is remote-only and can't be controlled over the network.

## Setup

1. In the **Atomberg Home** app, open **Profile → Developer Options** and enable it.
2. Copy the **API Key** and the **Refresh Token**.
3. Run **Control Fans** in Raycast. It asks for both on first launch.

## Commands

### Control Fans

A list of your fans. Selecting one opens a side pane with its full state: power, a 1–6 speed
tag row, sleep mode, light, timer and model.

The speed tags and the power tag are clickable. A speed dropdown in the top bar does the same
thing in one click, and the keyboard shortcuts below cover everything else.

| Shortcut | Action |
| --- | --- |
| `↵` | Toggle power |
| `⌘↑` / `⌘↓` | Faster / slower |
| `⌘1`…`⌘6` | Jump straight to a speed |
| `⌘D` | Toggle sleep mode |
| `⌘L` | Toggle light |
| `⌘T` | Set timer |
| `⌘R` | Refresh state |
| `⌘⇧R` | Re-fetch the device list |
| `⌘⇧X` | Log out |

### Fan Menu Bar

A fan icon in the macOS menu bar. Click it for a section per fan — turn on/off, a **Speed**
submenu with 1–6, and a **More** submenu for sleep mode, light and the timer.

It refreshes **hourly** by default. That is deliberate: the developer API allows around 100
calls a day, and a five-minute interval would spend close to 300. You can change the interval
in Raycast's command settings, but a short one will exhaust the budget. `Refresh` in the menu
pulls fresh state on demand.

Because of that interval, the state shown can lag if you change a fan from the app or a wall
switch. Only the labels lag — commands are absolute, so "Speed 4" always sets speed 4.

## How it works

Control is **cloud-based**. Commands go to Atomberg's servers and back to the fan, so both
your Mac and the fan need internet. The extension talks to four endpoints:

| Endpoint | Used for |
| --- | --- |
| `GET /v1/get_access_token` | Exchanges the refresh token for an access token |
| `GET /v1/get_list_of_devices` | The fans on the account |
| `GET /v1/get_device_state?device_id=all` | Current power, speed, sleep, light and timer |
| `POST /v1/send_command` | Everything that changes a fan |

The access token is a JWT; its `exp` claim is read (without verifying the signature) to decide
when to refresh, so a token is reused until it actually expires.

Not every Atomberg fan has a light. The API omits `led` from the state of fans that don't
have one, and the light controls are shown only for fans that report it, rather than being
matched against a hard-coded model list.

## Logging out

`⌘⇧X` clears the cached access token and device list, then opens preferences. A Raycast
extension can read its preferences but not write them, so the **API Key** and **Refresh
Token** fields have to be emptied by hand in the pane that opens — until they are, opening a
command simply signs back in.

That only removes the keys from this Mac. To revoke them properly, turn off **Developer
Options** in the Atomberg Home app, which invalidates the refresh token everywhere.

Replacing the credentials with a different account's is safe: cached data is tagged with a
hash of the credentials that produced it and is discarded as soon as they change.

## Development

```sh
npm install
npm run dev     # imports into Raycast and hot-reloads
npm run lint
npm run build
```

## License

MIT — see [LICENSE](LICENSE).

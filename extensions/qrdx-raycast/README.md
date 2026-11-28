# QRdx for Raycast

Make styled QR codes in Raycast with [`qrdx`](https://www.npmjs.com/package/qrdx), the open-source QR code library from [QRdx](https://qrdx.dev), and manage the dynamic codes in your QRdx account: change where they point after they're printed, and see who scans them.

Styled codes are drawn on your Mac and need no account. The dynamic-code commands need a QRdx API key, which every plan has, Free included.

## Commands

### Styled codes, no account

- **Generate QR:** enter a URL, an email address, a phone number or any text. Pick the body pattern, eye frame, eye center and call-to-action frame from previews, then set the colors, the frame's label (such as "Scan me"), a logo, the size and the quiet zone. Copy the code as PNG or SVG, save either to your Downloads folder, or save its settings to Saved QR Codes.
- **Saved QR Codes:** browse the codes you saved, with a preview and the settings of the selected one beside the list. Edit, export or delete them. They're kept in Raycast's local storage.
- **Generate QR with AI:** describe the code you want and Raycast AI fills in the settings. If the description doesn't say what to encode, you can enter it yourself. This command needs access to Raycast AI; Generate QR makes the same codes without it.

**Open in QRdx Playground** (⌘O) opens the full editor at qrdx.dev with the code's web address. Other content, colors and patterns stay in Raycast.

The patterns and frames are the ones `qrdx` offers: every body pattern, eye frame, eye center and call-to-action frame in the library.

### Dynamic codes, with your QRdx account

A dynamic code encodes a short link (such as `qrdx.dev/q/abc1234`) instead of the address itself. You can point it somewhere else at any time, so a printed code never goes stale, and QRdx counts every scan.

- **Dynamic QR Codes:** your workspace's codes, newest first, each drawn in its own design. Search them by title, destination, tag or short link. For each one:
  - **Show Scans:** total and unique scans for the last 7, 30 or 90 days, 12 months or all time (as far back as your plan keeps), with the top countries, cities, devices, systems, browsers and referrers.
  - **Change Destination** (⌘E): point the code at a new address, and rename it. The short link stays the same.
  - **Copy Short Link** (⌘L), copy or save the code as PNG or SVG, **Open in QRdx** (⌘O) or **Open Destination**.
- **Create Dynamic QR Code:** enter the address and an optional title. The code gets your workspace's default design, and you can copy or save it right away.

To set it up, create an API key in QRdx under [Settings → API keys & apps](https://qrdx.dev/dashboard?to=settings/developers&new=1) and paste it into this extension's preferences. A key belongs to one workspace. "Full access" lets the extension create and edit codes; a "Read only" key lists codes and their scans.

## Raycast AI

Mention QRdx in Raycast AI and ask for a code, for example "make a QR for https://qrdx.dev with a frame that says Scan for the menu". The AI picks the patterns, colors and frame from your words and saves the PNG to your Downloads folder. It can also list and search your saved codes.

With an API key, it also works with your dynamic codes: "make a dynamic QR code for https://example.com/menu", "how many scans did the spring menu code get this week?" or "point the spring menu code to https://example.com/summer". Raycast asks you to confirm before a code is created or changed.

## What leaves your Mac

Generate QR, Saved QR Codes and their previews make no network requests, except to load a logo from the address you enter. Generate QR with AI sends your description to Raycast AI. The dynamic-code commands and AI tools send your API key and requests to the QRdx API at `api.qrdx.dev`, and nothing else.

## QRdx or QR Code Generator?

Raycast's QR Code Generator extension makes a plain code quickly, from the clipboard or selected text. Use QRdx for styled codes, or for codes you manage in a QRdx account:

| | QR Code Generator | QRdx |
| --- | --- | --- |
| Plain code from text or a URL, PNG or SVG | Yes | Yes |
| From the clipboard or selected text | Yes | No |
| Shorten the link (is.gd, TinyURL) and add UTM tags | Yes | No |
| Body patterns, corner styles, frames, logos | No | Yes |
| Saved codes in Raycast | No | Yes |
| Dynamic codes: change the destination after printing | No | Yes, with a QRdx account |
| Scan analytics | No | Yes, with a QRdx account |

## Shortcuts

| Shortcut | Action |
| --- | --- |
| ⌘1, ⌘2, ⌘3, ⌘4 | In Generate QR's form, pick the body pattern, eye frame, eye center or frame from previews |
| ⌘C, ⌘⇧C | Copy the code as PNG, copy it as SVG |
| ⌘⇧S, ⌥⌘S | Save the PNG or the SVG to your Downloads folder |
| ⌘S | On a code's preview, save it to Saved QR Codes |
| ⌘E | Edit the code; on a dynamic code, change its destination |
| ⌘L | Copy a dynamic code's short link |
| ⌘⇧D | In a dynamic code's scans, change the date range |
| ⌘O | Open in QRdx Playground; on a dynamic code, open it in QRdx |

The extension's source is in the [QRdx repository](https://github.com/qrdxinc/qrdx/tree/main/plugins/raycast).

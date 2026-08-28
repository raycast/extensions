# OpenQR for Raycast

Create **dynamic (editable) QR codes**: one printed code whose destination you can
change later, with per-code scan analytics, managed from Raycast. Static codes too.

## How this differs from the other QR extensions in the Store

The QR extensions already in the Store turn something into a QR image, or turn a QR
image into something. OpenQR treats a QR code as an object that keeps working after
it has been printed: the code stays the same, and what it points at can change.

| Extension                                                                             | What it does                                                                                                         | Overlap with OpenQR                                           |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [QR Code Generator](https://www.raycast.com/Melvynx/qrcode-generator)                 | Renders a QR image locally (the `qrcode` npm package) from text, clipboard or selection. No account, works offline.  | The only real overlap, and only with OpenQR's static command. |
| [QRCP](https://www.raycast.com/yohann84l/qrcp)                                        | Transfers files between Mac and phone over Wi-Fi. The QR code is the transport, not the product.                     | None.                                                         |
| [QR Code Scanner](https://www.raycast.com/StevenRCE0/qr-code-scanner)                 | Reads a QR code off your screen.                                                                                     | None (it decodes, OpenQR encodes).                            |
| Link shorteners, e.g. [Bitly](https://www.raycast.com/blessanm86/bitly-url-shortener) | Shorten and list links. A short link can be re-pointed, but there is no QR command and no scan analytics in Raycast. | The short link only, never the printable code or its scans.   |

**If you only want a static image made offline, use QR Code Generator.** It is
lighter, it needs no account, and OpenQR is not trying to replace it.

What is only here, because it needs a server behind it:

- **Dynamic codes.** Create an `oqr.to` short link and get the QR image for it.
  Print the image, then re-point the destination whenever you like: the printed code
  never changes. No other extension in the Store produces a QR code whose destination
  can be changed after it is printed.
- **Re-pointing an existing code** from Raycast, without opening a dashboard.
- **Scan analytics per code:** total scans, last 7 days, and top countries, devices
  and referrers, in a Raycast detail view.
- **Your account's codes as a browsable list**, with the QR rendered for the selected
  row, so you can find a code and copy its image without hunting for the file.

Static generation is included so you do not need two extensions once you have an
account, but it is the commodity half. The dynamic half is the reason this exists.

## Setup

1. Create a free OpenQR account and API key at <https://openqr.uk/api>.
2. Run any OpenQR command. Raycast prompts for the key on first run, or set it under
   **Raycast → Extensions → OpenQR → API Key**.

The key is stored as a `password` preference and sent as
`Authorization: Bearer oqr_…` to `https://openqr.uk` through the official
[`@open-qr/sdk`](https://www.npmjs.com/package/@open-qr/sdk) client. Nothing else is
configured, and nothing is sent anywhere else.

Every command needs the key, including the static one: OpenQR authenticates its whole
API surface, so there is no anonymous mode to fall back on. That is the trade for the
static command living beside the dynamic ones.

## What is free, and what is not

Accounts are free and the API is free. [Pricing](https://openqr.uk/pricing) in full:

- **Free (£0):** unlimited static QR codes, 3 dynamic codes, scan counts by country
  for the last 7 days.
- **Pro (£9/mo or £72/yr):** unlimited dynamic codes, full analytics history, and the
  detailed dimensions (region, town/city, device, referrer).

The extension itself is free and MIT licensed, and it does not sell you anything: if
your account hits a plan limit, the API says so and the command surfaces it as a toast.

## Commands

### Generate Static QR Code

Encode any text or URL (`POST /v1/qr`). Choose **PNG** or **SVG**, set the pixel size,
and optionally set foreground and background colors (either `232E3A` or `#232E3A`). Both
formats honour the colors. From the result you can open the file, reveal it in Finder,
copy the file (or the SVG markup) to the clipboard, or generate another. The code never
expires and needs no server to resolve.

### Generate Dynamic QR Code

Create an editable short link on `oqr.to` (`POST /v1/dynamic`) from a destination URL,
with an optional label and saved theme. The short URL is copied to the clipboard, and
the **QR image for that short URL is rendered inline** to copy, save or open: a dynamic
code exists to be printed, so the link on its own is not the useful half. If a theme was given, the image uses its colors.

> Custom slugs, tags and folders are not set at creation. `/v1/dynamic` does not accept
> them; set them afterwards in the dashboard.

### Manage Dynamic QR Codes

Browse your dynamic codes (`GET /v1/dynamic`) with short URL and status. Per code:

- **See the QR** for the selected row in a detail pane, with short URL, destination and
  status. `Enter` copies the image, `Cmd+Shift+K` opens it full size.
- **Copy or open** the short URL, or open the destination.
- **Edit / re-point** the code (`PATCH /v1/dynamic/{id}`): change destination and label
  without reprinting anything.
- **View scan analytics** (`GET /v1/dynamic/{id}/scans`, 30-day window): totals, last 7
  days, top countries, devices and referrers. Or pull a scan count into a toast.
- **Delete** the code (`DELETE /v1/dynamic/{id}`) behind a confirmation.
- Open the code in the OpenQR dashboard.

Only the selected row renders a QR image, and renders are cached on disk by payload,
size, colors and format. Every `List.Item` mounts, so rendering per item would fire one
API request per code in the account each time the command opens.

## About OpenQR

OpenQR is a free, open-source QR generator ([open-qr/openqr](https://github.com/open-qr/openqr),
AGPL-3.0) plus a hosted API for dynamic codes. Scan analytics are aggregated at write
time and never store a scanner identifier, so there is nothing to re-identify.

## License

MIT © Sam Moreton

# OpenQR for Raycast

Generate QR codes and manage dynamic (editable) QR codes with scan analytics —
without leaving Raycast.

This is the in-repo source of truth for the extension. Publishing it to the
Raycast Store requires Sam's Raycast/GitHub account (see **Publishing** below);
the code here is what gets pushed.

## Setup

1. Create a free OpenQR API key at <https://openqr.uk/api>.
2. Run any OpenQR command in Raycast; you'll be prompted for the key on first
   run, or set it under **Raycast → Extensions → OpenQR → API Key**.

The extension talks to the OpenQR REST API via the official
[`@open-qr/sdk`](https://www.npmjs.com/package/@open-qr/sdk) client
(`Authorization: Bearer oqr_…`, base `https://openqr.uk`).

## Commands

### Generate Static QR Code (`generate-static-qr`)
Encode any text or URL as a QR code via `POST /v1/qr`. Choose **PNG** or **SVG**,
set the pixel size, and optionally pick foreground/background hex colors. The
rendered file is written to a temp dir; from the result view you can open it,
reveal it in Finder, copy the file (or SVG markup) to the clipboard, or generate
another.

### Generate Dynamic QR Code (`generate-dynamic-qr`)
Create an editable short link on `oqr.to` via `POST /v1/dynamic`. Enter a
destination URL (plus an optional label and saved theme); the resulting
`short_url` is copied to the clipboard automatically. The **QR code image for
that short URL is rendered inline** and can be copied to the clipboard, saved via
Finder, or opened — a dynamic code exists to be printed, so the link on its own
isn't the useful half. If a theme was given, the image uses it. Re-point the
destination any time without reprinting the QR.

> Custom slugs, tags and folders aren't set at creation — the `/v1/dynamic`
> endpoint doesn't accept them. Edit those afterwards in the dashboard.

### Manage Dynamic QR Codes (`manage-dynamic-qr-codes`)
Browse your dynamic codes (`GET /v1/dynamic`) with their short URLs and status.
Per code you can:

- **See the QR code** for the selected row without doing anything: the list shows
  a detail pane with the rendered image plus the short URL, destination and
  status. `Enter` copies the image; `Cmd+Shift+K` opens it full size.
- **Copy/open** the short URL or open the destination.
- **Edit / re-point** the code (`PATCH /v1/dynamic/{id}`) — change the
  destination and label without reprinting the QR.
- **View scan analytics** (`GET /v1/dynamic/{id}/scans`, 30-day window) in a
  detail view: totals, last-7-day count, and top countries / devices /
  referrers — or pull a quick **scan-count** summary into a toast.
- **Delete** the code (`DELETE /v1/dynamic/{id}`) behind a confirmation prompt.
- Open the code in the OpenQR dashboard.

## Develop

```sh
cd integrations/raycast
npm install
npm run dev        # ray develop — live-reloads into Raycast
npm run typecheck  # tsc --noEmit
npm run build      # ray build
npm run lint
```

`ray build` / `ray develop` require the local Raycast app and (for some commands)
a Raycast login. If you only need to validate the source, `npm run typecheck`
is enough.

## Icon

`assets/openqr-icon.png` is the real OpenQR mark at **512×512** (copied from
`brand/logo/png/openqr-icon-512.png`). Raycast renders it on light and dark
backgrounds; swap it for a dark-optimised variant before publishing if the
contrast needs it.

## Publishing

Not done here. Publishing to the Raycast Store is gated on Sam's GitHub/Raycast
account:

```sh
npm run publish   # npx @raycast/api publish
```

## License

MIT © Sam Moreton

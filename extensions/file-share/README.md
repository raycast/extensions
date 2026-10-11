# File Share

Hand out one link on your Wi-Fi and everyone nearby gets the same list in their browser — no app, no account, nothing uploaded to anyone's server.

It is a shared list, not a one-way drop: both sides add to it, both sides take things down.

## What it does

- **Runs from Raycast, outlives the command.** The session keeps going after you press Esc or close the window, and stops when you quit Raycast.
- **Shares what you already have.** Add files, folders and text from Raycast — they are referenced where they are, never copied to your Downloads.
- **Works in any browser.** Visitors search, preview (images, PDFs, markdown, video, audio), download one file, a selection or a whole folder — and upload their own files the same way.
- **Anyone can change the list.** Add, remove, or clear it in one go; files on disk are never touched.
- **Built for a phone too.** The list becomes a touch-sized layout, files can be dropped anywhere on it, and uploads show progress you can cancel or retry.
- **Light and dark**, following the system until you pick a side.

## Getting started

1. Open **File Share** in Raycast and press **Start Sharing**.
2. Choose the network interface to listen on, then send the link or the QR code to the other device.
3. Add what you want to share with **Share Finder Selection**, or let the other side upload and paste text on the page.

## Good to know

- **Uploads land in `~/Downloads`** (configurable) and join the list right away.
- **macOS may ask once** whether the service can accept incoming connections. Say yes — otherwise the page stays unreachable from other devices.
- **No accounts, by design.** Anyone who can reach the address can add and remove entries, so keep it to networks you trust and stop sharing when you leave one.
- **Nothing leaves your network.** The page, its styles and its scripts come from your Mac — no CDN, no telemetry, and it works without internet access.
- **The default port is `7331`.** If something else holds it, File Share says which program it is and offers a restart on a different port.

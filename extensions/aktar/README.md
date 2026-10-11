# Aktar

Upload files to your own S3-compatible storage (Amazon S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, MinIO, and more) straight from Raycast, with [Aktar](https://getaktar.com), the free, open-source uploader for macOS and Windows.

## Requirements

- macOS or Windows
- [Aktar](https://getaktar.com) 0.18.0 or later for Mac, or 0.11.0 or later for Windows, with at least one destination added in its Settings

## Setup

1. Run **Connect to Aktar** in Raycast.
2. Click **Connect** in the dialog Aktar shows.

That's it. Connecting turns on Aktar's local API (Aktar > Settings > Integrations) and hands this extension its token. You only do it once.

Prefer to set it up by hand? Turn on **Allow local connections** in Aktar > Settings > Integrations, copy the token, and paste it into this extension's **API Token** preference.

## Commands

- **Upload Clipboard**: uploads the copied file or screenshot and copies its link.
- **Upload Selected Files**: uploads the files selected in Finder (or File Explorer on Windows) to your default destination.
- **Upload File**: pick files, a destination (or Automatic, which follows each destination's Use For in Aktar), an optional folder, and when to delete them. With a single file, the optional **Name** field uploads it under a different name (its extension is kept unless you type one); it's what replaces `{filename}` in the destination's path template.
- **Search Uploads**: search your upload history with previews, copy links as URL, Markdown, HTML, or your custom template, jump to a file's folder, show a QR code for the link, replace an upload's file while its link stays the same, and delete uploads. Uploads set to auto-delete show the day they go away.
- **Browse Buckets**: browse every folder and file in your buckets (not only what Aktar uploaded), copy public links or temporary links that also work for private buckets, show QR codes for either, rename, move, replace a file in place, delete, create folders, and upload into any folder.
- **Watched Folders**: see the folders Aktar uploads from automatically and what each one is doing, enable or disable them, and pause or resume watching.
- **Toggle Watching**: pauses all watched folders until you resume them, or resumes them.
- **Connect to Aktar**: pairs the extension with the app.

## QR Codes

**Show QR Code** (⌘⇧Q, Ctrl+Shift+Q on Windows) in Search Uploads or Browse Buckets shows a QR code for the file's link, to open it on your phone or put it on a slide. Copy the QR code image to paste it anywhere, or save it as a PNG in your Downloads folder. In Browse Buckets you can also show a QR code for a temporary link (1 hour, 1 day, or 7 days), which works even for private buckets. **Create New Link** (⌘R on Mac) makes a fresh one when it has expired.

The QR code is made on your computer. The link is never sent to a QR service. The QR images of temporary links are removed from the extension's support folder once those links expire.

## Watched Folders

Aktar can upload files the moment they land in a folder you pick, such as your screenshots folder. You add folders and set their rules (destination, which files, what happens to the original) in Aktar > Settings > Watched Folders; the extension shows and controls them.

- **Watched Folders** lists every folder with its status (Watching, Paused, Disabled, Access Needed, Folder Not Found), how many files are waiting to finish writing, uploading, or failed, how many wait for you to confirm a large batch, its destination, and when it last uploaded.
- **Enable Folder** / **Disable Folder** turns one folder on or off. **Pause Watching** (⌘⇧P, Ctrl+Shift+P on Windows) pauses every folder for 1 hour, until tomorrow (midnight), or until you resume it; **Resume Watching** starts them again. Files that arrive while paused are uploaded when watching resumes.
- **Show in Finder** (File Explorer on Windows), **Copy Path**, and **Open Watched Folders Settings** (which opens that tab in Aktar).
- **Toggle Watching** pauses or resumes watching without opening a window, handy with a hotkey.

Watched folders need an Aktar version that has them. With an older one, the commands ask you to update Aktar.

## What Aktar Does for You

Uploads from Raycast go through the Aktar app, so they follow its settings:

- **Use For** (Aktar for Mac 0.14.0 or Aktar for Windows 0.7.0): a destination can claim kinds of files (images, videos, documents...) and extensions. Upload Clipboard, Upload Selected Files and Upload File on Automatic send each file to the destination that claims it, else to the one selected in Aktar.
- **Replace File** (same versions): writes a new file at an upload's key, so its link keeps working. Aktar can also clear the old version from a Cloudflare cache and run the destination's webhooks after it.

- **Already uploaded** (Aktar 0.10.0 or later): when the same file is already in that destination with the same Delete After time, Aktar doesn't upload it again and copies its existing link. The extension tells you with an "Already uploaded" message and the day the existing file is deleted, with a warning when that's not the Delete After you picked. Older Aktar versions upload the file again.
- **Image conversion**: Aktar can convert images to WebP or AVIF before uploading (Aktar 0.10.0 or later).
- **Hash file names**: path templates can use `{md5}` and `{sha256}` for names that only change when the file does.
- **Large files**: files over 5 GB are uploaded in parts automatically.

## Auto-Delete

Uploads can delete themselves after 1, 7, 14, or 30 days, handy for screenshots and files you only share once. Pick a time in the **Delete After** preference (used by Upload Clipboard and Upload Selected Files, and preselected in Upload File) or in the Upload File form.

- It needs Aktar 0.5.0 or later for Mac (0.1.2 for Windows), and auto-delete set up once for the destination: in Aktar's menu bar or tray panel (**Delete after**) or the destination's settings. Until then, uploads with a Delete After time fail with a message saying so.
- It can't be combined with a folder in Upload File. Files with a Delete After time are named with the destination's path template.

## Raycast AI

Mention `@aktar` to search your uploads, list what's in a bucket, or create a temporary link:

- `@aktar find the invoice PDF I uploaded`
- `@aktar what's in the design folder of my Demo bucket?`
- `@aktar give me a 2-hour link to design/hero-background.jpg`

The AI tools only read. They never upload, move, or delete anything. A temporary link lets anyone who has it download the file, even from a private bucket, so Raycast asks you before the AI creates one. AI links last 1 hour unless you ask for longer, and 24 hours at most; for up to 7 days, use Browse Buckets. Name destinations exactly as Aktar shows them.

## Preferences

- **Copy Format**: what the primary copy action and uploads put on your clipboard. By default it follows Aktar's own Output setting.
- **Delete After**: when Aktar deletes new uploads. Never by default.
- **API Token** and **Port**: only needed for the manual setup above.

## Troubleshooting

- **"Can't Reach Aktar"**: make sure Aktar is running and **Allow local connections** is on in Aktar > Settings > Integrations.
- **"Aktar Rejected the Connection"**: the token was regenerated in Aktar. Run **Connect to Aktar** again.
- **"Couldn't Verify Aktar"**: the app answering on Aktar's port couldn't prove it has your token, so the extension didn't send it. If Aktar is running, its token may have changed: run **Connect to Aktar** again.
- **"Update Aktar"**: this Aktar can't prove it's Aktar yet. Update to Aktar for Mac 0.18.0 or Aktar for Windows 0.11.0 or later.

## Privacy

Your storage credentials never leave Aktar: they stay in the macOS Keychain or Windows Credential Manager, and the extension never sees them. The extension only talks to Aktar on `127.0.0.1`, using a token Aktar generates, and only after the app on that port proves it has the same token, so another program can't collect it while Aktar isn't running, and Aktar uploads files directly to your storage. There is no Aktar server in between.

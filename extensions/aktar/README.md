# Aktar

Upload files to your own S3-compatible storage (Amazon S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, MinIO, and more) straight from Raycast, with [Aktar](https://getaktar.com), the free, open-source macOS menu bar uploader.

## Requirements

- macOS
- [Aktar](https://getaktar.com) 0.4.0 or later, with at least one destination added in its Settings

## Setup

1. Run **Connect to Aktar** in Raycast.
2. Click **Connect** in the dialog Aktar shows.

That's it. Connecting turns on Aktar's local API (Aktar > Settings > Integrations) and hands this extension its token. You only do it once.

Prefer to set it up by hand? Turn on **Allow local connections** in Aktar > Settings > Integrations, copy the token, and paste it into this extension's **API Token** preference.

## Commands

- **Upload Clipboard**: uploads the copied file or screenshot and copies its link.
- **Upload Selected Files**: uploads the files selected in Finder to your default destination.
- **Upload File**: pick files, a destination, and an optional folder.
- **Search Uploads**: search your upload history with previews, copy links as URL, Markdown, HTML, or your custom template, jump to a file's folder, and delete uploads.
- **Browse Buckets**: browse every folder and file in your buckets (not only what Aktar uploaded), copy public links or temporary links that also work for private buckets, rename, move, delete, create folders, and upload into any folder.
- **Connect to Aktar**: pairs the extension with the app.

## Raycast AI

Mention `@aktar` to search your uploads, list what's in a bucket, or create a temporary link:

- `@aktar find the invoice PDF I uploaded`
- `@aktar what's in the design folder of my Demo bucket?`
- `@aktar give me a 2-hour link to design/hero-background.jpg`

The AI tools only read. They never upload, move, or delete anything.

## Preferences

- **Copy Format**: what the primary copy action and uploads put on your clipboard. By default it follows Aktar's own Output setting.
- **API Token** and **Port**: only needed for the manual setup above.

## Troubleshooting

- **"Can't Reach Aktar"**: make sure Aktar is running and **Allow local connections** is on in Aktar > Settings > Integrations.
- **"Aktar Rejected the Connection"**: the token was regenerated in Aktar. Run **Connect to Aktar** again.

## Privacy

Your storage credentials never leave Aktar: they stay in the macOS Keychain, and the extension never sees them. The extension only talks to Aktar on `127.0.0.1`, using a token Aktar generates, and Aktar uploads files directly to your storage. There is no Aktar server in between.

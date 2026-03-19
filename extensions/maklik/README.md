# Maklik

Raycast extension to:
- Capture a region of the screen (native macOS selector)
- Compress to WebP with a size target
- Upload to any S3-compatible API (including Cloudflare R2)
- Copy a public URL to clipboard

## Command

- `Take Screenshot` (`no-view`)
- Bind a global Raycast hotkey to this command for one-keystroke capture.

## Preferences

Set these in Raycast Extension Preferences:
- `S3 Endpoint` (required): example `https://<account>.r2.cloudflarestorage.com`
- `Bucket` (required): default `shots`
- `Region` (required): default `auto`
- `Access Key ID` (required)
- `Secret Access Key` (required)
- `Public Base URL` (required): example `https://shots.danvdm.com`
- `Key Prefix` (optional): example `screenshots`
- `Force path style` (optional): default `true`
- `Compression Target Bytes` (optional): default `1048576`
- `Upload Retries` (optional): default `3`

## Behavior

On successful run:
1. Opens macOS native region selector via `screencapture -i`.
2. Compresses the image, targeting your configured max bytes.
3. Uses WebP when `sharp` is available, or JPEG fallback via `sips` if `sharp` runtime binaries are unavailable.
4. Uploads with key format `YYYY/MM/DD/<uuid>.<ext>` (with optional prefix).
5. Copies `<publicBaseUrl>/<key>` to clipboard.
6. Removes temporary local files.

If upload fails:
- Saves the compressed file to `~/Pictures/RaycastShots/failed`
- Copies that local file path to clipboard as fallback

If capture is cancelled:
- Exits cleanly without upload.

## Development

```bash
npm install
npm run lint
npm test
```

If you see a `Could not load the "sharp" module` error, run:

```bash
npm install --include=optional sharp
```

## Security Notes

- Do not hardcode credentials in source files.
- Store credentials only in Raycast preferences.
- Rotate any credentials previously shared in plain text.

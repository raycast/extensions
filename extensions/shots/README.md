# Shots

Raycast extension to:
- Capture a region of the screen with the native macOS selector
- Upload the current clipboard image file
- Compress images to WebP with a size target
- Upload to any S3-compatible API, including Cloudflare R2
- Copy a public URL to clipboard

## Commands

- `Take Screenshot` (`no-view`): capture a region, upload it, and copy the public URL.
- `Upload Clipboard Image` (`no-view`): upload the current clipboard image file or local image path.
- `Test Upload Settings` (`no-view`): verify S3-compatible upload settings without taking a screenshot.
- Bind a global Raycast hotkey to `Take Screenshot` for one-keystroke capture.

## Preferences

Set these in Raycast Extension Preferences:
- `S3 Endpoint` (required): example `https://<account>.r2.cloudflarestorage.com`
- `Bucket` (optional): default `shots`
- `Region` (optional): default `auto`
- `Access Key ID` (required)
- `Secret Access Key` (required)
- `Public Base URL` (required): example `https://shots.danvdm.com`
- `Key Prefix` (optional): example `shots`
- `Force path style` (optional): default `true`
- `Compression Target Bytes` (optional): default `1048576`
- `Upload Retries` (optional): default `3`

Raycast Cloud Sync can sync non-secret preferences between Macs. The secret access key is stored as a password preference and should be entered separately on each Mac.

## Behavior

On successful run:
1. Opens macOS native region selector via `screencapture -i` and plays the native screenshot sound.
2. Compresses the image, targeting your configured max bytes.
3. Uses WebP when `sharp` is available, or JPEG fallback via `sips` if `sharp` runtime binaries are unavailable.
4. Uploads with key format `YYYY/MM/DD/<uuid>.<ext>` (with optional prefix).
5. Copies `<publicBaseUrl>/<key>` to clipboard and shows a Raycast success toast.
6. Removes temporary local files.

`Upload Clipboard Image` supports clipboard entries that Raycast exposes as image files or local image file paths. Supported extensions include PNG, JPEG, WebP, HEIC, HEIF, and TIFF.

`Test Upload Settings` uploads a tiny temporary text object and then tries to delete it. Use it after setup to confirm credentials, bucket access, and endpoint configuration. If cleanup fails, delete the shown test key manually.

If upload fails:
- Saves the compressed file to `~/Pictures/Shots/failed`
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

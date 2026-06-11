# ImgBed Uploader for Raycast

Upload a copied screenshot or copied image file to ImgBed, then copy the returned URL back to the clipboard.

## Usage

```bash
npm install
npm run dev
```

In Raycast, run `Upload Clipboard Image`.

Recommended workflow:

```text
1. Copy a screenshot to clipboard, for example Control + Command + Shift + 4.
2. Run Upload Clipboard Image from Raycast.
3. The uploaded image URL is copied to clipboard.
```

## Preferences

The extension exposes these Raycast Preferences:

```text
ImgBed Base URL: Your ImgBed instance URL
Auth Code: Your ImgBed upload auth code
Upload Channel: cfr2
Auto Retry: false
```

The upload request matches:

```bash
curl -sS -X POST "$IMGBED_BASE/upload?uploadChannel=cfr2&returnFormat=full&autoRetry=false" \
  -H "authCode: $IMGBED_AUTH_CODE" \
  -F "file=@/path/to/image.png" \
  | jq -r '.[0].src'
```

## Clipboard support

This command supports:

```text
- Raw image data copied by macOS screenshot tools.
- Image files copied from Finder.
```

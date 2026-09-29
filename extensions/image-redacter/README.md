# Cloakshot

Redact sensitive information from screenshots, photos and PDFs without modifying the source file.

## How to use

1. Select an image or PDF in Finder or File Explorer, copy an image to the clipboard, or choose a file in the command's file picker.
2. Run **Redact Image or PDF**. Press `⌘V` on macOS or `Ctrl+V` on Windows to load the clipboard image.
3. Choose Rectangle, Circle, Freeform, Paint, or Text and mark everything that should be hidden. PDFs show a page list; use it or Page Up and Page Down to move between pages.
4. Keep the default effect (Mosaic for images, solid black for PDFs), or switch to Blur or Solid.
5. Save a redacted PNG or PDF, copy an image, or export an image with a presentation-ready frame.

Text detection runs locally in the browser with Tesseract.js. On its first use, the browser downloads the OCR engine and English language model from the jsDelivr CDN; the selected file is not uploaded.

## Plans

|            | Free                             | Pro ($19 once-off)                        |
| ---------- | -------------------------------- | ----------------------------------------- |
| Redactions | 5 per day                        | Unlimited                                 |
| Watermark  | Small Cloakshot badge on exports | None                                      |
| PDFs       | Up to 3 pages                    | Any length, with optional searchable text |

A redaction is spent when a file opens in the editor. Reopening the same file on the same day is free, and a file the free plan cannot export, such as a long PDF, opens in preview mode without spending one.

Run **Manage License** to see the current plan, buy Pro, or enter a license key. License keys are Ed25519-signed and verified offline.

### Checkout

**Buy Cloakshot Pro** opens [cloakshot.app](https://cloakshot.app/#pricing). Checkout remains disabled until the Rodehouse Peach Payments merchant and signed-license fulfillment are verified. The extension never issues its own licenses or handles card details. License signing happens on the payment backend; only the public verification key ships in the extension.

In development builds, **Manage License** also offers **Reset Today's Usage** for testing the daily limit.

## How PDF redaction works

Export builds a brand-new PDF instead of editing the original:

- Pages with redactions are flattened to images, so the covered text is removed rather than hidden behind a box.
- Pages without redactions are copied unchanged, so their text stays sharp and selectable. Comments, form fields, scripts and page thumbnails are stripped from them.
- Document metadata, attachments and earlier revisions are never copied.
- With **Searchable** enabled, redacted pages get an invisible OCR text layer. Words touching a redaction are always left out, so a light blur can never become selectable text again.

## Privacy and file safety

- The editor is served from `127.0.0.1` using an unguessable URL, and shuts down after five minutes without requests.
- The file stays on the computer and is never sent to a service.
- Export always creates a new download. The source file is opened read-only and is never overwritten.

## Development

```bash
npm install
npm run dev
```

Install [Raycast](https://www.raycast.com/) first. Clone this repository, run the commands above, then search for **Redact Image or PDF** in Raycast. Raycast Pro is not required.


The extension is MIT licensed. You may build it locally, modify it, or fork it. Its usage allowance is local product behavior, not a DRM or security boundary.

Use Solid for sensitive information. Blur and Mosaic are visual effects and may leave information recognizable.

The PDF renderer and writer are served from `assets/vendor`. After upgrading `pdfjs-dist` or `pdf-lib`, refresh the copies with `npm run vendor`.

## Why framing is built in

[ray.so](https://ray.so) frames source code and does not provide an API or upload flow for arbitrary images. Cloakshot therefore includes its own framed PNG export rather than relying on an unsupported integration.

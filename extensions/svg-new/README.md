# SVG.new for Raycast

Convert images to SVG vectors and remove backgrounds with [SVG.new](https://svg.new).

## Commands

- **Convert Image to SVG**: select an image in Finder and run the command. The SVG is saved next to the image and opened.
- **Convert Clipboard Image to SVG**: copy an image file, a screenshot or an image from a browser, then run the command. The SVG is saved to your Downloads folder and copied to the clipboard.
- **Remove Background**: select an image in Finder and run the command. A transparent PNG and an SVG without the background (`name-no-bg.png` and `name-no-bg.svg`) are saved next to the image.

Existing files are never overwritten. If `logo.svg` already exists, the new file is saved as `logo 2.svg`.

## Setup

1. Sign in at [svg.new](https://svg.new) and create an API key on the [account page](https://svg.new/account).
2. Install the extension and paste the key when Raycast asks for it.

## Credits

The commands use your SVG.new credits:

- Convert Image to SVG and Convert Clipboard Image to SVG use 1 credit per image.
- Remove Background uses 2 credits per image: one to vectorize the image and one to remove the background.

Free accounts get 3 credits a day. Paid plans are listed on the [pricing page](https://svg.new/pricing).

## Images

- PNG, JPG and WebP images are sent as they are.
- HEIC, TIFF, AVIF, GIF and BMP images are converted to PNG on your Mac first, with the built-in `sips` tool.
- Images larger than 3 MB are scaled down before upload.

Images are sent to SVG.new for processing. Each vectorized image and its SVG are saved to your SVG.new history.

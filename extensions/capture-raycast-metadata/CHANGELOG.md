# Capture Raycast Metadata Changelog

## [Save to Your Extension, Custom Wallpaper, Name Tokens and Reliability Fixes] - 2026-11-21

- Save screenshots as PNG to the `metadata` folder of the extension running with `npm run dev`, when exactly one is. The toast names the extension. Turn off **Extension in Development** to use the Default Save Location (formerly Screenshots Directory).
- Add **Custom Wallpaper**: capture only the Raycast window and place it on your chosen image, so every screenshot has the same background. Works with PNG, JPEG and TIFF.
- Screenshot Name takes tokens: `%e` extension name, `%i` next number, `%y` `%m` `%d` date, `%H` `%M` `%S` time. It starts from the new default `%e-%i` (`my-extension-1.png`); your old name is not carried over.
- The result toast offers Show in Finder (⌘O) and Copy Path.
- The success toast now appears only after the screenshot file is written. It used to appear before the capture finished, even when the capture failed.
- Warn when the saved image is not 2000 × 1250 px, the size the Store requires. PDFs are saved without a size check.
- Show an error when the chosen Default Save Location no longer exists, instead of saving to Downloads.
- A `/` or `:` in Screenshot Name becomes `-`, instead of writing into a subfolder.
- Find Raycast's main window even when Settings or other Raycast windows are open.
- Fix saving when the screenshots directory has a trailing slash or contains spaces.
- Failure toasts now offer Copy Error.

## [Update Raycast API] - 2024-07-11

- Update Raycast API version to 1.78.1

## [Update Raycast API] - 2022-12-05

- Update Raycast API version to 1.44.0

## [Update Capture Raycast Metadata] - 2022-05-04

- Increase the delay of Toast pop-ups to 0.3 second.

## [Update Capture Raycast Metadata] - 2022-04-25

- Add preference Screenshots Directory, you can set the directory where the screenshots are saved

## [Added Capture Raycast Metadata] - 2022-04-15

- Release of Capture Raycast Metadata version 1.0
- **Capture Raycast Metadata**: Capture a screenshot for Raycast Extension's metadata.

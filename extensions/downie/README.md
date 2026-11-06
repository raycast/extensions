# Downie

Send video links to Downie with per-download options.

## What's new

- New **Download Current Browser Tab** command that sends the page in your frontmost browser (Safari, Chrome, Arc, Brave, Edge, Dia, Vivaldi, Orion) to Downie, optionally as audio or MP4.

## Commands

- **Download Links** accepts up to 50 HTTP/HTTPS URLs, one per line. Choose Downie’s normal postprocessing, audio extraction, or MP4 conversion and an optional destination folder.
- **Download Clipboard Links** loads clipboard text into the same reviewable form. Submit to send the links.

Enable **Open User-Guided Extraction** when a page needs interactive extraction. This opens Downie’s extraction window and overrides postprocessing, as defined by Downie.

## Requirements

Install [Downie](https://software.charliemonroe.net/downie/). The extension discovers Downie 4 or an installed app named Downie (the Setapp edition name documented by the vendor). Downie handles its own license, supported sites, login prompts, queue, and errors.

## Behavior

The extension sends the vendor’s `downie://XUOpenURL` requests directly to the installed Downie app. URL parameters are encoded so a video URL’s query string remains intact. A destination must be an existing folder. Leaving it empty uses Downie’s current settings. Global settings are not modified.

A success message means links were sent to Downie. It does not claim the downloads completed. View progress, login prompts, or failures in Downie. If a batch stops partway through dispatch, the error reports how many links were sent; check Downie before retrying.

## Development

Run `npm ci`, `npm run lint`, `npm test`, `npm run typecheck`, and `npm run build`. Tests cover nested query encoding, destination paths, deduplication, input limits, and extraction options.

## Sources and scope

- [Official Downie automation guide](https://software.charliemonroe.net/help/downie/?article=automation)
- [Official getting started guide](https://software.charliemonroe.net/help/downie/)
- [Raycast extension structure](https://developers.raycast.com/information/file-structure)

The current Raycast Store source tree was checked for an existing Downie package; none was present. This package performs supported per-download integration rather than generic app launching.

The installed app’s scripting dictionary advertises `start queue`, but it timed out in live tests on this machine. That command is excluded.

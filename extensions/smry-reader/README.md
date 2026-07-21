# smry Reader

Browse and search every open browser tab in Raycast, then hand the page you choose to smry's web reader or save queue. This extension is the Raycast integration for the smry service; it does not replace Raycast's native Reader Mode.

## Browser Access

smry Reader uses Raycast's Browser Extension API to list tabs and capture the rendered HTML of the tab you explicitly choose. Raycast will offer to install its browser extension if it is not already available.

The selected URL and rendered HTML are sent to `api.smry.ai` only after you choose **Open in smry** or **Save in smry**. smry returns a private, short-lived ingest token and opens the web reader. If the page cannot be captured, the extension safely falls back to opening its public URL in smry.

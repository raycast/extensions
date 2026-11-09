# SnapRender

Capture website screenshots and read web pages as Markdown from Raycast, using the [SnapRender](https://snap-render.com) screenshot API. Pages render on SnapRender's servers, so nothing needs to be installed on your Mac.

## Setup

1. Create a free account at [app.snap-render.com](https://app.snap-render.com/auth/signup). The free plan includes 200 captures a month.
2. Copy your API key (it starts with `sk_live_`) from the dashboard.
3. Paste it into the **API Key** field when Raycast asks for it, or later in the extension preferences.

## Commands

- **Screenshot Website**: enter a URL (prefilled with your current browser tab), pick a device, format, full page and dark mode, and see the result in Raycast. From there you can copy the image, save it to Downloads, open it, or copy a signed URL that renders the same capture without exposing your API key.
- **Screenshot Current Tab**: captures the page open in your frontmost browser and copies the image to the clipboard.
- **Read Page as Markdown**: extracts the main content of a page as Markdown, ready to copy or paste. Pass a URL as the argument or leave it empty to read the current browser tab.
- **Check Usage**: shows the captures left this month, your plan and the reset date.

## AI Tools

Type @ and pick SnapRender in Raycast AI to read a page, take a screenshot (saved to your Downloads folder) or check your usage.

## Preferences

- **API Key**: your SnapRender API key. It is stored by Raycast and only sent to `app.snap-render.com`.
- **Default Format**: PNG, JPEG, WebP or PDF.
- **Default Device**: desktop (1280 x 800), MacBook Pro, iPhone 15 Pro, iPhone 14, Pixel 7 or iPad Pro.

## Current Tab URL

The extension finds the current tab with the [Raycast Browser Extension](https://www.raycast.com/browser-extension) when it is installed. Without it, it asks Safari or Chromium browsers (Chrome, Arc, Brave, Edge, Vivaldi) for the front tab, and macOS may ask you once to allow Raycast to control the browser.

## Notes

- Each screenshot or page read uses one capture. Failed captures are free.
- SnapRender can only reach public pages. Localhost, private networks and pages behind a login are not reachable.
- Ads and cookie banners are removed from screenshots.

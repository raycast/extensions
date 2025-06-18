# Bypass Paywall

This Raycast extension allows you to bypass paywalls on popular services. It works with most popular browsers.

## Features

- **Bypass Paywalls**: Access content on websites with paywalls.
- **Multiple Modes**:
    - **Active Tab Detection**: Automatically detects the URL from your current browser tab. This is perfect for creating a keyboard shortcut for quick access.
    - **Bypass from Clipboard**: Bypasses the paywall for a URL copied to your clipboard.
- **Browser Support**: Works with a variety of popular browsers (Safari, Chrome, Firefox, Edge, Arc, Brave, Vivaldi, Orion).
- **Service Integration**: Utilizes services like 12ft.io and freedium.cfd (for Medium articles) to bypass paywalls.

## How to Use

### Bypass Paywall for Active Tab:

1.  Ensure you have a webpage with a paywall open and active in your browser.
2.  Open Raycast and run the "Bypass Paywall for Active Tab" command.
3.  The extension will attempt to bypass the paywall and open the content in a new tab.

### Bypass from Clipboard:

1.  Copy the URL of the paywalled article to your clipboard.
2.  Open Raycast and run the "Bypass from Clipboard" command.
3.  The extension will process the URL and copy the bypassed link back to your clipboard. You can then paste this link into your browser.

## Supported Browsers

The extension supports most popular browsers based on WebKit, Chromium and Gecko. It has been explicitly tested and confirmed to work with the following browsers:

- Safari
- Google Chrome
- Microsoft Edge
- Firefox
- Arc
- Brave Browser
- Vivaldi
- Orion
- Zen

If your browser is not on this list, the extension will attempt to treat it as a Chromium-based browser. This means many other browsers may work, but compatibility is not guaranteed for those not explicitly listed. Gecko-based browsers other than Firefox and Zen are less likely to work without being explicitly added.
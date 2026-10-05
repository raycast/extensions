# QR Code Generator

Generate a QR code from a URL in PNG or SVG format that will be automatically opened.

## Features

- Generate a QR code from text/URL, clipboard, or selection — each command has its own icon for quick recognition.
- **Custom color:** pick a preset or enter a custom hex color for the QR foreground. A warning is shown for low-contrast colors that may not scan reliably.
- **Link shortening (opt-in):** shorten long URLs before generating, keeping the QR code simpler and easier to scan. Tries [is.gd](https://is.gd) and [da.gd](https://da.gd) (direct redirects) first, then [TinyURL](https://tinyurl.com). The URL is sent to the shortener only when this option is enabled; if shortening fails, an error is shown and generation is cancelled so you never get a QR of the un-shortened link by surprise. Note: these are third-party services that may log the URLs you submit.
- **UTM parameters (opt-in):** append `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content` to http(s) URLs for campaign tracking.

## Contributors

- [Melvynx](https://github.com/melvynx)
- [darmiel](https://github.com/darmiel)
- [hetommy](https://github.com/hetommy)

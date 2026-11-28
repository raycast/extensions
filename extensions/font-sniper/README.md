# Font Sniper

Identify, preview, and download fonts referenced by a website’s CSS in Raycast.

## Features

- Identify and download fonts from any website
- Support for WOFF2, WOFF, TTF, OTF, and EOT formats
- Auto-convert web fonts to desktop formats (TTF/OTF)
- Filter by format preferences
- Batch download selected fonts
- Preview a typeface before downloading it, with a sample drawn from its own glyphs and details about its family, weight, style, and glyph count
- Copy the font family name or source URL, or search for the family on Google Fonts and the web

## Preview a website font

Open **Download Fonts**, enter a website URL, and choose **Find Fonts**. Highlight a result and choose **Preview Font** from the action panel. The preview uses characters from the file when a language subset or icon font lacks the sample text. Variable fonts display their default instance. Press Escape to return to your selections.

**Copy Font Name** uses the CSS family from the results list. In the preview it uses the family embedded in the file, which can differ from a website’s CSS alias. **Copy Font URL** appears for externally hosted files.

## Raycast AI

- “@font-sniper Which fonts are used on https://example.com?”
- “@font-sniper Find Source Serif 4 on Google Fonts.”
- “@font-sniper Download the regular Inter WOFF2 font from https://example.com.”

AI downloads save the chosen face to your Downloads folder after confirmation and follow your web-font conversion preference.

## Disclaimer

FontSniper is a developer utility designed to help designers and developers inspect and access publicly available font assets for testing and research purposes.

- **Respect Licenses:** Many web fonts are licensed software. Downloading a font does not grant you a license to use it. You are responsible for ensuring you have the appropriate rights or licenses for any font you download and use.

- **No Circumvention:** This tool only detects files that are already sent to your browser for rendering. It does not bypass DRM, decrypt secured files, or access private directories.

- **User Responsibility:** The author of this extension assumes no liability for the misuse of downloaded assets. Please support type foundries by purchasing proper licenses for your projects.

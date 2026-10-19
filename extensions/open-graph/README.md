![Github Cover](https://github.com/davidho0403/raycast-open-graph/assets/75478661/051e3bcd-0151-464e-9540-c90a34ce1d62)

# Open Graph

This is a simple Raycast extension that allows users to quickly check the Open Graph (OG) meta tags of any webpage. This tool is especially useful for developers who need to verify if the right OG tags are rendered for different pages during development, or for anyone who wishes to preview the thumbnail or other OG tag information of a website.

## Setup:

No additional setup is required. Enter a URL, or launch **Preview Open Graph** without an argument to use a URL from your clipboard. If the clipboard doesn't contain a URL, a form lets you enter one.

## Features:

- Inspect every Open Graph and Twitter Card meta tag, including repeated tags.
- Preview social titles, descriptions, and images, with standard page metadata as a fallback.
- Browse multiple images, inspect declared dimensions and alt text, and open or copy absolute image URLs.
- Check the four required Open Graph properties: `og:title`, `og:type`, `og:image`, and `og:url`. URL checks require absolute HTTP or HTTPS URLs. Validation does not fetch images or check platform-specific requirements.
- Copy individual values or export all metadata as JSON, Markdown, or HTML meta tags. Exports preserve tag order and duplicates; JSON also includes resolved image URLs.
- Inspect the final URL after redirects, edit the input URL, refresh metadata, or retry a failed request. Requests time out after 15 seconds.
- Use **Preview Open Graph (Browser Extension)** to inspect the active browser tab.

## How to Use:

1. Launch **Preview Open Graph** with a URL, use the clipboard fallback, or enter a URL in the form. URLs without a scheme use HTTPS.
2. Inspect the preview and metadata panel. Use **Browse Images** to inspect all declared images.
3. Open the action panel to validate, export, edit the URL, or refresh. Pages without social tags show their standard title and description.

The preview uses the HTML returned by the server. It does not run page JavaScript, and social platforms may render a different card. Image dimensions shown here come from meta tags, rather than image inspection.

## Contributing:

Feel free to contribute to the development of this Raycast extension. If you encounter any issues or have suggestions, please open an issue or submit a pull request.

## Screenshots:

![open-graph-1](https://github.com/davidho0403/raycast-open-graph/assets/75478661/a42b1530-98b2-488f-926a-596c0d3eff46)
![open-graph-2](https://github.com/davidho0403/raycast-open-graph/assets/75478661/80a7b321-6f82-4f4a-8242-3a38a012a360)
![open-graph-3](https://github.com/davidho0403/raycast-open-graph/assets/75478661/b2fe5c73-59cf-4286-b035-fa82be00907d)

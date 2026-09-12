# Gradient Generator

A minimalist, local-first Raycast extension for crafting gradients. Create a gradient, preview it in a large panel, copy ready-to-use snippets (CSS, SwiftUI, Tailwind arbitrary value), generate random gradients, save your favorites locally, and export as SVG or PNG files.

## Key Features

* Create linear, radial, or conic gradients (with angle for linear)
* Large preview and gradient metadata
* Copy snippets: CSS, SwiftUI, Tailwind arbitrary value
* Random gradient generator (2–3 stops)
* Saved gradients list with quick preview and delete
* Export gradients as SVG or PNG files with customizable settings
* Enhanced validation with error checking and warnings
* Configurable export directories and Tailwind output preferences
* Local storage only (no network calls)

## Commands

* **Create Gradient**: Form to define type, colors, and angle; pushes to Preview
* **Random Gradient**: Generates a random 2–3 stop gradient and shows Preview
* **Saved Gradients**: List of saved gradients with color tags; open Preview; rename labels (Quick Rename or Edit Label); delete

## Preferences

* **SVG Export Directory**: Choose where SVG files are saved (default: ~/Downloads)
* **PNG Export Directory**: Choose where PNG files are saved (default: ~/Downloads)
* **Tailwind Output Mode**: Choose between utility classes (bg-[...]) or raw CSS output

## Export Features

* **SVG Export**: Save gradients as scalable vector graphics with customizable dimensions
* **PNG Export**: Export as high-quality PNG images with multiple size presets (HD, Full HD, 2K, 4K)

## Frequently Asked Questions

**Do I need an internet connection?**

No. The extension works completely offline with no network calls required.

**Can I export my gradients?**

Yes. You can copy CSS, SwiftUI, and Tailwind snippets directly from the preview panel, or export as SVG/PNG files to your chosen directory.

**Are my saved gradients synced?**

All gradients are stored locally in Raycast's storage. They're not synced across devices right now.

**How does the random generator work?**

It creates gradients with 2–3 color stops using random colors and positions, perfect for inspiration and quick mockups.

**What export formats are supported?**

SVG (scalable vector) and PNG (raster) formats are supported. PNG exports include multiple size presets and optional transparency.

## Troubleshooting

**I can't see my saved gradients.**

Make sure you've actually saved gradients using the save button in the preview panel. Check that the filter isn't set incorrectly.

**The preview isn't showing.**

Try refreshing the extension or restarting Raycast. The preview requires the gradient data to be properly formatted.

**Copy actions aren't working.**

Ensure you're using the latest version of Raycast. The copy functionality depends on Raycast's clipboard API.

**Export isn't working.**

Make sure you've set the export directory preferences in Raycast settings. The extension needs to know where to save your exported files.

**Validation errors appear.**

The extension now includes enhanced validation. Check that your hex colors are valid (e.g., #ff0000) and that you have at least 2 color stops.
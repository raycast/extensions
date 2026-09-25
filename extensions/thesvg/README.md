# theSVG for Raycast

Search, preview, and copy 7,400+ brand SVG icons from [thesvg.org](https://thesvg.org) directly in Raycast.

## Commands

### Search Brand Icons

Browse and search the full theSVG library. Filter by category, preview icons, and copy SVG source code instantly.

**Actions:**

| Name | macOS shortcut | Windows shortcut | Description |
| ---- | -------------- | ---------------- | ----------- |
| Copy SVG<sup>1</sup> | `↵` or `⌘` `↵` | `↵` or `Ctrl` `↵` | Copy the SVG source code to clipboard |
| Show Details<sup>1</sup> | `⌘` `↵` or `↵` | `Ctrl` `↵` or `↵` | Show information about the SVG |
| Copy Direct URL | `⌘` `⇧` `C` | `Ctrl` `Shift` `C` | Copy the theSVG direct URL |
| Copy jsDelivr URL | `⌘` `⌥` `C` | `Ctrl` `Alt` `C` | Copy the jsDelivr CDN URL |
| Open on theSVG | `⌘` `O` | `Ctrl` `O` | Open the icon page in your browser |
| Open Brand Website | `⌘` `⇧` `O` | `Ctrl` `Shift` `O` | Open the brand website in your browser |
| Toggle Layout | `⌘` `L` | `Ctrl` `L` | Toggle the layout between `List` and `Grid` |
| Copy as JSX | `⌘` `⇧` `J` | `Ctrl` `Shift` `J` | Copy as a React JSX component |
| Copy as HTML | `⌘` `⇧` `H` | `Ctrl` `Shift` `H` | Copy as an `<img>` tag |
| Copy as Data URI | `⌘` `⇧` `D` | `Ctrl` `Shift` `D` | Copy as inline data URI |
| Copy Hex Color | `⌘` `⇧` `X` | `Ctrl` `Shift` `X` | Copy brand color |

1. Choose the primary action using the `Primary Action` preference.

### Quick Copy

Copy a brand SVG instantly without opening Raycast's UI. Type the brand name as an argument.

Example: `Copy Brand Icon` > `github` copies the GitHub SVG to your clipboard.

## Preferences

| Setting | Description | Default |
| --- | --- | --- |
| Default Variant | Which variant to copy (default, mono, light, dark) | Default (Brand Color) |
| Layout | Choose how to display results | Grid |
| Primary Action | The action to perform when selecting an item | Copy SVG |

## Features

- Search 7,400+ brand icons with alias matching
- Filter by 100+ categories (AI, Design, DevTool, Cloud, etc.)
- Preview icon thumbnails in the list
- View all available variants (up to 7 per icon)
- Copy raw SVG source code
- Copy as JSX React component, HTML img tag, or Data URI
- Copy brand hex color
- Copy CDN URLs (thesvg.org + jsDelivr)
- Full detail view with SVG source preview

## Links

- [thesvg.org](https://thesvg.org) - Browse all icons
- [GitHub](https://github.com/glincker/thesvg) - Source code

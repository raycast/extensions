# Open Symbols Search

Search [Open Symbols](https://opensymbols.dev) from Raycast: ~29,900 icons from ten open-source libraries (Lucide, Tabler, Phosphor, Material Design Icons, Hugeicons, Font Awesome, Iconoir, Ionicons, Heroicons and Feather). Copy them into code or design tools, export them as PNG, SVG or PDF, or drop them into Xcode as SF Symbols.

It works like [SF Symbols Search](https://www.raycast.com/jffrykkn/sf-symbols-search), but for symbols that aren't Apple's.

## Features

- **Search** by name or tag. Tags come from each library's own metadata, so "delete" finds trash and "favorite" finds heart. Paste an Xcode name like `lucide.heart` to jump straight to it.
- **Library filter** in the search bar dropdown, with counts.
- **Weights** from Ultralight to Black (⌘⇧W), drawn from each symbol's Ultralight, Regular and Black masters, with the in-between weights interpolated.
- **Export** as PNG, SVG, PDF or custom SF Symbol template (for Xcode), at any size, weight and color.
- **Copy Image** pastes a PNG straight into Figma, Keynote, Slack and so on. **Copy SVG Code** pastes markup into your code, or into Figma as an editable vector.
- **Show Info** (⌘I) shows all nine weights side by side, plus tags, license and outline/fill variants.
- **Show in Every Library** (⌘⇧F) shows the same icon across all ten sets.
- **Pinned** and **Recently Used** sections at the top.
- **Symbol updates**: the extension checks for new Open Symbols releases and updates itself only when symbols have actually changed.

### Actions

| Action | Shortcut |
|---|---|
| Copy Image, or your chosen primary action | ↵ |
| Copy SVG Code | ⌘⇧S |
| Copy Xcode Name (`lucide.heart`) | in the action panel |
| Copy Name (`heart`) | ⌘⌥C |
| Copy Symbol Template File | ⌘⇧C |
| Export Symbol (in the formats ticked in settings) | ⌘E |
| Export Outline and Fill | ⌘⇧E |
| Export Symbol Size… / Weight… / As… (one-off overrides) | in the action panel |
| Copy SwiftUI, UIKit or AppKit snippet | in the action panel |
| Show Info | ⌘I |
| Show in Every Library | ⌘⇧F |
| Show Outline and Fill | ⌘⇧V |
| Pin / Unpin | ⌘. |
| Weight… (grid preview) | ⌘⇧W |
| Copy Attribution | ⌘⇧A |
| Open on opensymbols.dev | ⌘O |
| Clear Recently Used Symbols | ⌃⇧X |

### Preferences

| Setting | Default | |
|---|---|---|
| Primary Action | Copy Image | Also Copy SVG Code, Copy Xcode Name, Paste Xcode Name, Copy SwiftUI Image, Copy Symbol Template File |
| Grid Size | Small | |
| Show Symbol Names | On | |
| Show Recently Used Symbols | On | |
| Export Folder | ~/Downloads | Files are saved straight into this folder |
| Export Size | 128 px | 16, 24, 32, 48, 64, 128, 256, 512 or 1024. Pixels for PNG, points for PDF, `width`/`height` for SVG |
| Export Weight | Regular | Separate from the grid's preview weight |
| Export Color | black | A name (`blue`, `gray`, …), `#RRGGBB`, or `currentColor` so an SVG takes the CSS text color (PNG and PDF fall back to black) |
| Export Frame | Square | **Square** keeps the library's canvas and padding, so a set of icons lines up. **Tight** crops to the symbol's edges |
| Export Formats | PNG | Any mix of PNG, SVG, PDF and Custom Symbol Template |
| Symbol Updates | On | Check for new symbols at most once a week |

Exported file names record the size and any setting that isn't the default (for example `lucide.heart-256px-bold-blue.png` or `lucide.heart-128.svg`), so exports with different settings don't overwrite each other. Custom SF Symbol templates are named for Xcode (`lucide.heart.svg`).

## Good to know

- Symbols download the first time they appear and are cached after that, so the first screen of a new search takes a second or two to fill in, and later it's instant and works offline.
- Previews and exports are rendered on your Mac. The only network requests are downloading symbol templates from the Open Symbols repository on GitHub and checking for symbol updates.

## Symbol updates

Choose **Check for Symbol Updates** from any symbol's action panel. There's also a standalone Check for Symbol Updates command; it's switched off by default so it doesn't clutter Raycast's search. Turn it on in Settings → Extensions if you want it in search or on a hotkey. With **Symbol Updates** switched on, Search Open Symbols also checks once a week and offers the update in a notification.

An update is only installed when a new Open Symbols release actually adds, removes or redraws symbols. A release that only changes documentation is ignored.

## Licenses and attribution

Each library keeps its own license. Show Info lists it for every symbol, and **Copy Attribution** (⌘⇧A) gives you a ready-made credit line.

| Library | License |
|---|---|
| Feather, Heroicons, Hugeicons, Iconoir, Ionicons, Phosphor, Tabler | MIT |
| Lucide | ISC |
| Material Design Icons | Apache 2.0 |
| Font Awesome | CC BY 4.0 |

Exported SVGs carry the credit as a comment, PDFs in their document properties and PNGs in a metadata field. Keep those in place.

**Font Awesome (CC BY 4.0).** If you ship Font Awesome icons in an app, website or product, credit them where people can see credits, such as an About screen, acknowledgements page or site footer. The credit should name Font Awesome, link to the license, and say the icon was modified (it was converted and resized). Copy Attribution produces exactly that. Brand icons such as `github` are also trademarks: only use them to refer to that brand.

**MIT, ISC and Apache 2.0.** No visible credit is required. These licenses ask that the copyright and license notice travel with the files, which the embedded attribution covers. If your app or site has an acknowledgements or open-source licenses page, list the libraries you used there.

Open Symbols itself is MIT.

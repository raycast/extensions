# Blade Icons

Raycast extension to search the 100,000+ icons on [blade-ui-kit.com/blade-icons](https://blade-ui-kit.com/blade-icons).

## Features

- Live search against blade-ui-kit.com (same results as the website)
- Icon set dropdown with per-set icon counts; the last selected set is remembered
- Style filter (All / Outline / Solid / Monochrome / Color) via `⌘⇧F`, remembered
  across launches; each set in the dropdown shows which styles it contains as
  letters (s = solid, o = outline, c = color)
- Results are sorted so icons from the sets you copy from most come first
- "Show Similar Icons" (`⌘⇧M`) using the website's similar-icons suggestions
- Configurable primary action (what `↵` copies) in the extension preferences

## Actions (⌘K)

| Action | Shortcut | Example |
| --- | --- | --- |
| Copy Name | `↵` (default, configurable) | `solar-outgoing-call-bold-duotone` |
| Copy Component | `⌘⇧X` | `<x-solar-outgoing-call-bold-duotone />` |
| Copy Directive | `⌘⇧D` | `@svg('solar-outgoing-call-bold-duotone')` |
| Copy Helper | `⌘⇧H` | `{{ svg('solar-outgoing-call-bold-duotone') }}` |
| Copy Enum (Guava Icons) | `⌘⇧E` | `SolarIcons::OutgoingCallBoldDuotone` |
| Copy Installer Command | `⌘⇧I` | `composer require codeat3/blade-solar-icons` |
| Copy SVG | `⌘⇧S` | cleaned `<svg xmlns=…>` markup |
| Copy SVG Source | `⌘⌥S` | markup exactly as served by the site |
| Copy PNG | `⌘⇧P` | 512px PNG with transparent background |
| Show Similar Icons | `⌘⇧M` | |
| Open on blade-ui-kit.com | `⌘O` | |
| Open Icon Set on GitHub | `⌘⇧G` | e.g. codeat3/blade-akar-icons |

The enum action follows the naming of the
[Guava Icons](https://filamentphp.com/plugins/guava-icons) generator
(`php artisan filament-icons:generate`): class = pascal-cased set name, case =
pascal-cased icon name without the set prefix. Heroicons map to Filament's
built-in `Filament\Support\Icons\Heroicon` enum (`Heroicon::OutlinedAcademicCap`
for `heroicon-o-*`, `Heroicon::AcademicCap` otherwise).

PNG export renders through macOS' built-in SVG support (no external tools
required) and always produces a transparent background.

## Notes

- Style detection is heuristic: real hues in the SVG → *Color* (white/black
  knockout designs like Game Icons stay monochrome); otherwise whole-name tokens
  such as `outline`, `linear`, `-o`, `fill`, `solid`, `bold`, `duotone` decide,
  with per-set conventions (Bootstrap Icons' unsuffixed icons are outline,
  `-fill` marks solid) and the SVG's paint attributes as fallback. *Monochrome*
  matches everything that isn't *Color*. Only colorless icons are tinted to the
  theme's text color; icons with explicit paints render as-is.
- `src/sets.json` (set ids, prefixes, counts, styles, composer packages, GitHub
  repos) is scraped from the website. Refresh it with `npm run scrape-sets`.

## Development

```sh
npm install
npm run dev
```

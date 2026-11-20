# Style Dictionary for Raycast

Browse, search, and copy the design tokens of your [style-dictionary](https://styledictionary.com) projects without leaving the keyboard.

## Features

- **Multiple projects.** Point a project at one or more folders of token files. Every `.json` and `.json5` file inside them is read recursively. Switch between projects from the search bar.
- **Legacy and DTCG formats.** `value`/`type` and `$value`/`$type` tokens both work, even mixed in one project. Aliases like `{color.brand.500}` are resolved by style-dictionary itself.
- **Drill-down grid.** Token groups are folders you open, and tokens are tiles with a preview of their value: color swatches, dimension bars, font and typography samples, and shadows.
- **Search.** Search every token below the current group by name, path, or value. Colors match in any format, so `#336699` finds a token stored as `oklch(49.93% 0.0987 250.43)`.
- **Copy templates.** Turn a token into the code you actually write, such as `var(--color-brand-500)` or `design.color("brand.500")`.
- **Color formats.** Copy any color as HEX, RGB, HSL, or OKLCH.
- **Pins.** Pin up to nine tokens or groups per project and reach them with <kbd>⌘1</kbd>–<kbd>⌘9</kbd>.

## Getting started

1. Run **Manage Projects** and add a project.
2. Pick the folders that hold your token files.
3. Run **Browse Tokens**.

## Copy templates

Each project has a list of templates, one per line. Every template that applies to a token becomes a copy action on it.

```
var(--{kebab-name})
@color design.color("{name}")
@spacing theme.space.{camel-name}
```

A line starting with `@group.path` only applies inside that group, and `{name}` becomes relative to it. With the templates above, `color.brand.500` gets:

- `design.color("brand.500")`
- `var(--color-brand-500)`

| Placeholder    | `color.brand.primaryLight` with `@color` |
| -------------- | ---------------------------------------- |
| `{name}`       | `brand.primaryLight`                     |
| `{path}`       | `color.brand.primaryLight`               |
| `{kebab-name}` | `brand-primary-light`                    |
| `{camel-name}` | `brandPrimaryLight`                      |
| `{snake-name}` | `brand_primary_light`                    |
| `{value}`      | the resolved value                       |

Use **Enter Copies** in the project settings to choose what <kbd>↵</kbd> copies: the value, the name, or the most specific matching template.

## Keyboard shortcuts

| Shortcut                                                                            | Action                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| <kbd>↵</kbd>                                                                        | Copy the value (or what **Enter Copies** says) |
| <kbd>⌘</kbd> <kbd>↵</kbd>                                                           | Copy the name (the value if ↵ copies the name) |
| <kbd>⌥</kbd> <kbd>⌘</kbd> <kbd>H</kbd> / <kbd>R</kbd> / <kbd>S</kbd> / <kbd>L</kbd> | Copy a color as HEX / RGB / HSL / OKLCH        |
| <kbd>⌘</kbd> <kbd>1</kbd>–<kbd>9</kbd>                                              | Open a pinned group or copy a pinned token     |
| <kbd>⌥</kbd> <kbd>⌘</kbd> <kbd>1</kbd>–<kbd>9</kbd>                                 | Pin the selected token or group to that slot   |
| <kbd>⌘</kbd> <kbd>R</kbd>                                                           | Reload the token files                         |

## License

MIT

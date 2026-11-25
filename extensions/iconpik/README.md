# iconPik

Search, preview, and copy brand SVG icons from [iconpik.com](https://www.iconpik.com). No account or API key is required. An internet connection is needed to load the catalog and SVG artwork.

## Commands

- **Search Brand Icons**: Search by brand name, alias, or category. Use the category dropdown to narrow results. Press Enter to copy SVG, or open the Actions menu for URLs and icon details.
- **Copy Brand Icon**: Enter a brand name to copy the first matching icon as SVG. Use Search Brand Icons when you want to choose between multiple matches.

In **View Details**, copy an available SVG variant or copy the default artwork as a React JSX component, an HTML image tag, or a data URI. You can also copy the brand color and open the icon or brand website.

## Preferences

**Default Variant** controls which artwork the main copy actions use: brand color, mono, light, or dark. Not every icon has every variant. If your chosen variant is unavailable, nothing is copied; open View Details to select an available variant.

## Shortcuts

| Action                       | macOS       | Windows      |
| ---------------------------- | ----------- | ------------ |
| Copy SVG                     | Cmd C       | Ctrl C       |
| Copy direct URL              | Cmd Shift C | Ctrl Shift C |
| Open on iconPik              | Cmd O       | Ctrl O       |
| View details                 | Cmd D       | Ctrl D       |
| Copy JSX component (details) | Cmd Shift J | Ctrl Shift J |
| Copy HTML image (details)    | Cmd Shift H | Ctrl Shift H |
| Copy data URI (details)      | Cmd Shift D | Ctrl Shift D |
| Copy brand color (details)   | Cmd Shift X | Ctrl Shift X |

Direct and hosted URLs currently point to the same iconPik-hosted SVG. Search shows up to 100 matching icons; type a more specific query to narrow the list.

Based on the MIT-licensed theSVG extension. Brand artwork remains subject to its owners' terms.

## Open-source license

<details>
<summary>MIT license and original attribution</summary>

MIT License

Copyright (c) 2025 thesvg.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

</details>

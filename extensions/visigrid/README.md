# VisiGrid for Raycast

Spreadsheet powers from your launcher, backed by the [VisiGrid](https://visigrid.app) engine — fully local, no account, no cloud.

## Commands

### Quick Calc

Evaluate any Excel formula against the table on your clipboard.

Copy data from anywhere — cells from a spreadsheet, a table in an email, a space-aligned table in a Slack message, raw CSV — then type a formula like `SUM(A1:A10)` or `SUMPRODUCT(B2:B9,C2:C9)`. The clipboard is loaded into a grid at A1 and the formula runs through VisiGrid's engine (123 functions, Excel semantics).

Real-world tables are normalized automatically: tab-separated and space-aligned columns both parse, and money formatting is cleaned so the math works — `$28,500` reads as 28500, `(1,234)` as −1234.

### Peek Spreadsheet

Browse your recent spreadsheet files (`.sheet`, `.xlsx`, `.xls`, `.ods`, `.csv`, `.tsv`) and preview any of them as a grid — without opening an app. Backed by Spotlight, newest first.

### Open Workbook

Search recent spreadsheet files and open them in VisiGrid.

## Requirements

The extension drives the `vgrid` CLI, which ships with VisiGrid:

```
brew install --cask visigrid/tap/visigrid
```

VisiGrid is a fast, native, open-source (AGPL) spreadsheet — a 43 MB binary that opens 100,000-row files instantly. macOS and Linux. Learn more at [visigrid.app](https://visigrid.app).

If `vgrid` lives somewhere unusual, point the extension at it in Preferences → vgrid Path.

## Privacy

Everything runs locally. Clipboard data is piped to the `vgrid` binary on your machine and nowhere else; no network requests are made.

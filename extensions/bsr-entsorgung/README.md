# BSR Entsorgung

Quickly look up which bin to use for any type of waste, and check upcoming collection dates for your Berlin address — powered by the [BSR (Berliner Stadtreinigung)](https://www.bsr.de) public API.

## Commands

### Search Waste

Search the BSR waste database to find out which bin a specific item belongs in.

- Type any waste item (e.g. _Pfanne_, _Batterie_, _Joghurtbecher_)
- Results show the item name, waste fraction, and the corresponding bin color
- Open the BSR detail page for full disposal instructions
- Copy the disposal tip to your clipboard with `⌘C`
- Falls back to a BSR.de browser search if the database is unavailable

**Bin colors:**

| Icon | Color  | Fraction                               |
| ---- | ------ | -------------------------------------- |
| ⚫   | Grey   | Restmüll (residual waste)              |
| 🟤   | Brown  | Biogut (organic waste)                 |
| 🔵   | Blue   | Papier (paper)                         |
| 🟡   | Yellow | Wertstoffe / Gelbe Tonne (recyclables) |
| 🟢   | Green  | Glas (glass)                           |
| ♻️   | —      | Recycling                              |

### Collection Calendar

Shows upcoming waste collection dates for the current and next month, grouped by date, for your configured Berlin address.

- Configure your street and house number once in the extension preferences
- Each entry shows the date and which bins will be collected that day
- Copy a date entry to the clipboard with `⌘C`
- Open the BSR calendar website directly from the action panel
- Jump to preferences with `⌘⇧,`

## Setup

For the **Collection Calendar** command, open the extension preferences and enter your Berlin street name and house number. The **Search Waste** command works without any configuration.

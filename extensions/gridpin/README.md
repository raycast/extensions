# GridPin Offline Geocoder

Type an address, get its latitude and longitude; type a point, get the nearest addresses. The answers come from a
country file on your Mac: no network, no API key, nothing leaves the machine.

## What to install first

The extension runs the `gridpin` program, which you install once with Homebrew (Apple silicon):

```bash
brew install gridpin/gridpin/gridpin
```

and the file of the country you need (the list and sizes: `gridpin sheets list`):

```bash
gridpin sheets fetch fr
```

The extension downloads nothing itself: when the program or a country file is missing, it shows the command to copy.

## Commands

- **Geocode Address**: up to five answers with their precision (house, street, town). Enter copies `lat, lon`; the
  other actions open the point in Apple Maps or OpenStreetMap and copy the address. An answer marked "weak: check it"
  is a guess, for example the town when the street was not found.
- **Reverse Geocode**: type `48.8685, 2.3303` and get the nearest addresses with their distance.

The dropdown in the search bar switches between the countries you have downloaded.

## Preferences

- Default Country: the code of the sheet to ask first (`fr`, `us`, …).
- GridPin Program: only if `gridpin` is not in `/opt/homebrew/bin`, `/usr/local/bin` or `~/.cargo/bin`.
- Sheets Folder: only if your sheets are not where `gridpin sheets where` says.

GridPin: <https://gridpin.dev>. The country files are built from Overture Maps and national open data under their own
licenses; `gridpin sheets list` and <https://gridpin.dev/layers> name them.

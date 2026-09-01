# Yet Another Timezone Tool

Type a time the way you'd say it, and see it in every place you care about.

```
15 sf            3 pm in San Francisco, shown in all your locations
15-17 sf         a two-hour window
tomorrow 9 utc   tomorrow at 09:00 UTC
thu 17 et        next Thursday, 17:00 Eastern
lon              what time is it in London right now?
```

Made for the moment on a call when someone in New York asks "would 3 to 5 my time work?". Type `15-17 nyc`, read your own hours off the screen, paste the whole line into the chat for everyone else.

## Quick start

1. Install the extension and open Raycast.
2. Type **Convert Time** and press Enter. You'll see the current time in a handful of starter locations: UTC, London, New York, San Francisco and Tokyo.
3. Type `15 sf`. Every row now shows 3 pm San Francisco time in its own zone, and the line above the rows confirms what was understood: `Tue 1 Sep · 15:00 San Francisco`.
4. Press Enter to copy the selected row, or ⌘Enter to copy the whole list as one line, ready to paste.
5. To change the locations, open **Manage Locations** (or press ⌘⇧M from Convert Time).

## What to type

Start with a time. Add a place, an end time and a date as you need them, in any order.

| Type this | To see |
|---|---|
| `15`, `15:30`, `3pm`, `1530` | that time today, in your default zone |
| `15 sf` or `sf 15` | 15:00 in San Francisco |
| `15-17 sf` | 15:00 to 17:00, San Francisco time |
| `15 sf 2h`, `15 sf 90m` | a window of that length |
| `tomorrow 15 sf`, `thu 15 sf` | another day |
| `29 oct 15 sf`, `2026-10-29 15 sf`, `29/10 15 sf` | a specific date |
| `15 utc+2` | a fixed offset |
| `sf` | the current time in San Francisco |
| *(nothing)* | the current time everywhere, ticking |

A bare number is 24-hour, so `7` is seven in the morning; write `7pm` for the evening. Ranges follow the same idea: `7-9pm` is 19:00 to 21:00, and `11-1pm` is 11:00 to 13:00.

A place can be any of these:

- one of your locations, or just the start of its name: `san`, `new york`
- a code: `LON`, `SFO`, `NYC`, `JFK`. Cities pick up their airport and UN/LOCODE codes automatically, and you can add your own aliases in Manage Locations
- a zone abbreviation: `cest`, `pt`, `est`, `ist`, `z`
- a zone name: `Europe/Berlin`, `Pacific Time`

Your own locations are checked first, then a built-in list of 140,000 places, then zone names. That's why `cst` means Chicago, until you add a Chinese city and your list wins. When a word could mean two things (`s` could be San Francisco or Seattle), the header says so and asks for another letter.

Dates matter more than they seem: Europe and North America switch their clocks on different weeks, and for that week "same time next Thursday" is off by an hour. `thu 17 et` gets it right.

## Reading the rows

Each row is one location, sorted west to east.

- The **coloured dot** shows whether that's a reasonable hour there: green for 9–18, yellow for the shoulders (7–9 and 18–21), red for the middle of the night. The hours are yours to change.
- The **time** or window, right-aligned so the column is easy to scan.
- The **zone abbreviation** (`PDT`, `CEST`).
- The **offset** from the place you typed (`−9h`). That place is marked "anchor" in its subtitle.
- A red **+1d** or **−1d** when that row has already crossed midnight.

Press ⌘I for the **hour strip**: one column per location, one row per hour, with your window as a band across all columns. A row where every column is green is a time that works for everyone.

## Copying

| Key | Copies |
|---|---|
| Enter, or ⌘1 – ⌘9 | the selected row, e.g. `06:00 SFO (PDT)` |
| ⌘Enter | everything on one line, e.g. `15:00 LON (BST) = 07:00 SFO (PDT) / 10:00 NYC (EDT) / 14:00 UTC` |

The format is a template you can change in Settings. `{time} {code} ({abbr})` is the default; `{label}`, `{tz}`, `{date}`, `{day}` and `{offset}` are also available. After copying, Raycast returns to its root search (there's a setting for that too).

## More keys in Convert Time

| Key | Does |
|---|---|
| ⌘← / ⌘→ | an hour earlier / later |
| ⌘⇧← / ⌘⇧→ | 15 minutes earlier / later |
| ⌘⇧↑ / ⌘⇧↓ | the day before / after |
| ⌘⇧Enter | make the selected row the anchor ("and what if Tokyo says 9?") |
| ⌘I | show or hide the hour strip |
| ⌃X | remove the selected location |
| ⌘⇧M | open Manage Locations |

The dropdown at the top right sets the zone used when you type a time without a place. Nudging the time or re-anchoring rewrites the search box to match (`lon 15`), so what you see is always what was calculated.

## Your locations

**Manage Locations** is where you decide what Convert Time shows.

- **Add** (⌘N) searches 70,000 cities by name or code, another 70,000 smaller places, and every named time zone. Try `Zürich`, `ZRH`, `JFK`, `Pacific Time` or `Hallstatt`. For a place that's missing, add a **custom place** (a name plus a zone) or search OpenStreetMap from the same screen.
- **Edit** to rename, add aliases (`zrh, zurich`), give a place its own business hours, or make it your home.
- **Home** (⌘⇧H), **move up / down** (⌘⌥↑ / ⌘⌥↓), **remove** (⌃X).
- **Export / Import** moves the list through the clipboard as JSON, handy for sharing with a colleague.

Cities you add bring their codes along as aliases, so `sfo` and `sf` work the moment San Francisco is on the list.

## Menu bar

**Menu Bar Clock** puts the locations you choose in the menu bar, like `LON 13:15 • SFO 05:15`, with every location in its dropdown. Run the command once from the root search to place it, then pick locations with ⌘M in Manage Locations. The text format and separator are in Settings.

## Settings

Open them with ⌘, in Raycast or from the ⌘K menu in Convert Time. Changes apply the next time a command starts.

| Setting | Default |
|---|---|
| Time format | 24-hour |
| Copy template and separator | `{time} {code} ({abbr})`, ` / ` |
| Sort | west to east (or east to west, or the order in Manage Locations) |
| Business and shoulder hours | 9–18 and 7–21 |
| Colours for business, shoulder and off hours | Raycast's green, yellow and red for the dots; any hex colour works, which helps if red and green look alike to you |
| Hour strip colours | its own green, ochre and a quiet grey for off hours; set them to match the dots if you prefer |
| Locations file | empty (see below) |
| Convert Time: default zone, return to root after copying, local row, day/month order | local, on, on, day/month |
| Menu Bar Clock: template, separator, icon | `{code} {time}`, ` • `, on |
| Manage Locations: online lookup | on |

## Using two Macs

Raycast syncs your settings between Macs; an extension's own data stays on the Mac where it was created, and that includes the location list. To share it, point **Locations file** at a path inside a synced folder, for example `~/Library/Mobile Documents/com~apple~CloudDocs/Raycast/yatt.json`. The extension then reads and writes that file instead of its local store.

## Questions

**It says "didn't understand".** One word wasn't a time, a date or a place. The header names it, and the last good result stays on screen.

**`cst` picks Chicago, but I meant China.** Add Shanghai to your locations, or type the city name. Your list always wins.

**My town is missing.** Add it as a custom place with a name and a zone, or turn on online lookup and search again.

**I changed a setting and nothing happened.** Close the command with Esc and open it again; Raycast reads settings when a command starts.

## For developers

```
npm install
npm run dev            # start in Raycast
npm test               # unit tests
npm run generate-data  # rebuild assets/data from the sources below
```

## Data & licences

The code is MIT. The bundled data comes from other projects and stays under their terms: GeoNames (CC BY 4.0, modified), UN/LOCODE (UNECE terms, via `@geoapify/un-locode`), OpenStreetMap-derived coordinates and time zone boundaries (ODbL), OurAirports (public domain), `@vvo/tzdb` (MIT) and Unicode CLDR (Unicode-3.0). The icon is from Iconoir (MIT). The full notices are in [NOTICE.md](NOTICE.md), which also ships inside the extension.

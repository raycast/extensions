# Fastener Lookup

Tap drills, clearance holes, counterbores, and thread specs for CAD work — one searchable command, every row is a single value, Enter copies the bare number for pasting straight into a dimension field.

Covers **#0–1" UNC/UNF** and **M1.6–M30 coarse/fine**.

## Queries

Type a size the way you'd say it. Keywords narrow the result.

| Query | Result |
| --- | --- |
| `#10` | tap drills (UNC + UNF), three clearance fits, SHCS counterbore, thread specs |
| `10-32`, `1/4-20`, `m8x1`, `m10 x 1.25` | that exact thread |
| `#10 close`, `m6 close fit` | one row — the one number you need |
| `clearance for #10`, `tap 3/8`, `cbore 1/4`, `counterbore m6` | one section only |
| `.375`, `0.19`, `6mm`, `number 10`, `10` | decimal → nearest size; bare `10` shows #10 and M10 |
| `unc 1/4`, `m8 fine` | coarse / fine series |
| _(empty)_ | full drill & tap chart, browsable |

Every metric row also shows the nearest inch drill (e.g. M6 clearance 6.6 mm ≈ H drill) for shops running imperial sets.

## Actions

| Shortcut | Action |
| --- | --- |
| `Enter` | Copy the value (bare number) |
| `Ctrl/Cmd+Enter` | Paste the value into the active app |
| `Ctrl/Cmd+=` | Copy and return to root search — paste there and keep typing to use Raycast's calculator |
| `Ctrl/Cmd+Shift+C` | Copy the value in the other unit |
| `Ctrl/Cmd+Shift+U` | Copy with unit (`0.1960 in`) |
| `Ctrl/Cmd+Shift+D` | Copy the drill designation (`#9`) |
| `Ctrl/Cmd+Shift+S` | Copy the size's full spec sheet as Markdown |
| `Ctrl/Cmd+I` | Toggle the spec-sheet side panel |

The dropdown in the search bar forces every value to display in inches or millimeters.

## Data

| Section | Source |
| --- | --- |
| Tap drills (inch) | Machinery's Handbook, ~75% thread |
| Tap drills (metric) | ISO 261 / DIN 13 (major − pitch) |
| Clearance holes (inch) | ASME B18.2.8 — close / normal / loose |
| Clearance holes (metric) | ISO 273 — H12 / H13 / H14 |
| Counterbores | Socket head cap screw, ASME B18.3 / ISO 4762 |
| Minor diameter | Basic internal thread, D − 1.0825 P |

Counterbore depth is listed as the head height; add ~0.010 in / 0.3 mm for flush seating. Values are the standard published tables — verify against the governing drawing standard for critical features.

## Development

```
npm install
npm run dev     # ray develop
npm test        # parser + data integrity tests
npm run lint
```

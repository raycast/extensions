# Ferroscale Quick Weight Changelog

## [0.2.0] - 2026-06-01

### New Commands
- **Compare Profiles** — side-by-side weight and cost comparison of two quick-weight queries with a weight delta (absolute + relative)
- **Browse Profiles** — browsable list of all profiles, standard sizes, cross-section areas, perimeters, formulas and EN references
- **Browse Materials** — browsable list of all material grades, densities, standard references and `mat=` shortcut hints
- **Calculation History** — view, search, re-run, delete and bulk-export (CSV / JSON / Markdown) recent calculations saved by Quick Metal Weight

### Quick Metal Weight Enhancements
- **Surface area output** — every result now shows estimated outer painted surface area (m²) and linear surface (m²/m) where the profile perimeter can be determined
- **Pricing support** — new `price=`, `currency=`, and `basis=` flags display unit price and total cost alongside weight
- **Custom area override** — new `area=<mm²>` flag bypasses the size table / formula and uses a user-supplied cross-section area
- **Thickness shorthand** — `t=<value>` flag accepted for flat bar, sheet, and plate as an alternative to embedding thickness in the dimension string
- **Normalized input** — every result shows the canonical normalised query string for easy copy/reuse

### New Profile Datasets
- **SHS standard sizes** (`shss` / `shstd`) — EN 10219/10210 square hollow section table with cross-section area and outer perimeter for each size
- **RHS standard sizes** (`rhss` / `rhstd`) — EN 10219/10210 rectangular hollow section table with cross-section area and outer perimeter for each size
- **Equal-leg angle standard sizes** (`la` / `leq` / `stda`) — EN 10056-1 equal-leg angle table with cross-section area and outer perimeter for each size

### Perimeter Data for All Structural Profiles
- Added `perimeterMm` to every size in IPE, IPN, HEA, HEB, HEM, UPN, UPE and Tee profiles, enabling surface area output for all structural sections
- Formula used: `P = 2·h + 4·b − 2·t_w` for I/H/channel sections; `P = 2·(b + h)` for tee sections (corner fillets not applied, ~2–3 % conservative overestimate)

### Extended Material Library
- **S275JR** and **S460M** steel grades added
- **Stainless duplex 1.4462 (2205)** added
- **Aluminum** — EN AW-6061, EN AW-5754, EN AW-3003 added
- **Copper family** — Copper C11000 (ETP), Brass CW614N, Bronze CW453K
- **Titanium** — Grade 2 (CP Ti) and Grade 5 (Ti-6Al-4V)
- **Cast iron** — EN-GJL-250 and EN-GJL-300

### Extended Parser (`mat=` aliases)
- Steel: `s275`, `s275jr`, `s460`, `s460m`
- Stainless: `duplex`, `2205`, `14462`
- Aluminum: `6061`, `5754`, `3003`
- Copper: `copper`, `cu`, `brass`, `bronze`
- Titanium: `ti`, `titanium`, `tigrade2`, `tigrade5`, `ti6al4v`
- Cast iron: `castiron`, `greyiron`, `gjl250`, `gjl300`

### Parser / Flag Additions
- `price=<value>` — unit price per pricing basis
- `currency=<EUR|USD|GBP|PLN|BAM>` — pricing currency (default: EUR)
- `basis=<kg|lb|m|ft|pc>` — pricing basis (default: weight/kg)
- `area=<mm²>` — custom cross-section area override
- `t=<thickness>` — thickness shorthand for `fb`, `sheet`, `plate`
- `unit=<mm|cm|m|in|ft>` — fallback unit for bare numbers (existing, now documented)

### Dataset Version
- Bumped to `2026.06.1`

---

## [0.1.0] - 2026-03-04

- Quick metal weight calculator from shorthand input (e.g. `shs 40x40x2x4500mm`)
- Supports tubes, bars, plates, sheets, and EN structural profiles (IPE, IPN, HEA, HEB, HEM, UPN, UPE, Tee)
- Material flags: steel (S235JR, S355JR, S420M), stainless steel (304, 316, 316L), aluminum (6060, 6082, 7075)
- Optional flags for quantity (`qty=`), material (`mat=`), custom density (`dens=`), and unit (`unit=`)
- Real-time results with weight breakdown as you type
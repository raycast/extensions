# Ferroscale Raycast Extension

Quick one-line metal weight calculations and profile tools for structural and fabrication work.

## Commands

| Command | Description |
|---------|-------------|
| **Quick Metal Weight** | Calculate weight from a shorthand query string typed directly in Raycast |
| **Compare Profiles** | Side-by-side weight and cost comparison of two queries with weight delta |
| **Browse Profiles** | Browse all profiles, standard sizes, areas, perimeters and EN references |
| **Browse Materials** | Browse all material grades, densities and standard references |
| **Calculation History** | View, search, re-run and export recent Quick Metal Weight calculations |

---

## Quick Metal Weight

### Query Grammar

```
<alias> <dimensions>x<length> [flags…]
```

For EN standard-size profiles (IPE, SHS standard, angles, …):
```
<alias> <size>x<length> [flags…]
```

Dimensions and length are separated by `x`. A trailing unit suffix (`mm`, `cm`, `m`, `in`, `ft`) is accepted on any number; bare numbers default to `mm` (overridable with `unit=`).

---

### Profile Aliases

#### Bars
| Alias | Profile | Dimension order |
|-------|---------|-----------------|
| `rb` / `roundbar` | Round bar | `D × L` |
| `sb` / `squarebar` | Square bar | `A × L` |
| `fb` / `flatbar` | Flat bar | `W × T × L`  or  `W × L t=T` |

#### Tubes — custom dimensions
| Alias | Profile | Dimension order |
|-------|---------|-----------------|
| `chs` / `pipe` | Circular hollow section | `OD × T × L` |
| `shs` / `squarehollow` | Square hollow section | `A × T × L`  or  `A × A × T × L` |
| `rhs` / `rectangular` | Rectangular hollow section | `W × H × T × L` |

#### Tubes — EN standard sizes
| Alias | Profile | Example |
|-------|---------|---------|
| `shss` / `shstd` | SHS (EN 10219/10210) | `shss 40x4x6000` |
| `rhss` / `rhstd` | RHS (EN 10219/10210) | `rhss 100x60x5x6000` |

#### Structural beams
| Alias | Profile | Standard |
|-------|---------|---------|
| `ipe` | IPE beam | EN 10365 |
| `ipn` | IPN beam | EN 10024 |
| `hea` | HEA wide flange (light) | EN 10365 |
| `heb` | HEB wide flange (medium) | EN 10365 |
| `hem` | HEM wide flange (heavy) | EN 10365 |

#### Channels
| Alias | Profile | Standard |
|-------|---------|---------|
| `upn` | UPN channel | EN 10365 |
| `upe` | UPE channel | EN 10279 |

#### Tee sections
| Alias | Profile | Standard |
|-------|---------|---------|
| `tee` / `t` | Equal-leg tee | EN 10055 |

#### Angles
| Alias | Profile | Dimension order |
|-------|---------|-----------------|
| `angle` / `l` | Angle — custom dimensions | `legA × legB × T × L`  or  `A × T × L` |
| `la` / `leq` / `stda` | Equal-leg angle (EN 10056-1) | `A × T × L`, e.g. `la 80x8x6000` |

#### Sheets and plates
| Alias | Profile | Dimension order |
|-------|---------|-----------------|
| `sheet` / `sht` | Sheet | `W × T × L`  or  `W × L × T`  or  `W × L t=T` |
| `plate` / `pl` | Plate | same as sheet |
| `chequered` | Chequered plate | `W × T × L` |
| `expanded` | Expanded metal | `W × T × L` |
| `corrugated` | Corrugated sheet | `W × T × L` |

---

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `qty=<n>` | `1` | Quantity (number of pieces) |
| `mat=<grade>` | `steel-s235jr` | Material grade or alias |
| `dens=<kg/m³>` | — | Custom density override (takes precedence over `mat`) |
| `unit=<mm\|cm\|m\|in\|ft>` | `mm` | Fallback unit for bare numbers with no inline suffix |
| `t=<value>` | — | Thickness shorthand for `fb`, `sheet`, `plate` |
| `area=<mm²>` | — | Custom cross-section area — bypasses size table and formula |
| `price=<value>` | — | Unit price amount (enables pricing output) |
| `currency=<code>` | `EUR` | Pricing currency: `EUR`, `USD`, `GBP`, `PLN`, `BAM` |
| `basis=<basis>` | `kg` | Pricing basis: `kg`, `lb`, `m`, `ft`, `pc` |

---

### Material Aliases (`mat=`)

#### Steel (EN 10025)
`steel` · `s235` · `s235jr` · `s275` · `s275jr` · `s355` · `s355jr` · `s420` · `s420m` · `s460` · `s460m`

#### Stainless Steel (EN 10088)
`stainless` · `inox` · `304` · `aisi304` · `14301` · `316` · `aisi316` · `14401` · `316l` · `aisi316l` · `14404` · `duplex` · `2205` · `14462`

#### Aluminum (EN 573)
`alu` · `aluminum` · `aluminium` · `6060` · `6061` · `6082` · `5754` · `3003` · `7075`

#### Copper & Alloys
`copper` · `cu` · `brass` · `bronze`

#### Titanium
`ti` · `titanium` · `tigrade2` · `tigrade5` · `ti6al4v`

#### Cast Iron
`castiron` · `greyiron` · `gjl250` · `gjl300`

---

### Examples

```
# Bars
rb 30x6000 qty=10 mat=s355
sb 40x3000 mat=alu
fb 80x8x6000 qty=4
fb 100x6000 t=10

# Custom hollow sections
chs 60.3x3.2x3000 qty=4 mat=316
shs 40x40x4x6000
rhs 120x80x4x6000 qty=2

# EN standard hollow sections
shss 40x4x6000 qty=5 mat=s355
rhss 100x60x5x6000 qty=4

# Structural beams
ipe 200x6000 mat=s355
hea 240x9000 qty=3 mat=s355
upn 160x6000

# Angles
angle 75x75x8x6000
la 80x8x6000 qty=12 mat=s355

# Sheets and plates
sheet 1250x3000x2 qty=5
plate 1500x3000 t=10 qty=3

# Pricing
ipe 200x6000 mat=s355 price=0.85
fb 80x8x6000 qty=20 price=1.50 currency=EUR basis=kg

# Custom area override on an EN profile
ipe 6000 area=3200 mat=s355

# Custom density
rb 30x6000 dens=8960
```

---

## Compare Profiles

Enter two quick-weight queries (same syntax as Quick Metal Weight) into fields **A** and **B**, then press **Compare** to see:

- Full side-by-side table: profile, material, density, length, quantity, linear density, unit weight, total weight, surface area, total price
- Weight delta (B − A): absolute difference in kg and relative percentage

Results can be copied as Markdown or CSV.

---

## Browse Profiles

Searchable list of all profiles grouped by category (Bars, Tubes, Plates & Sheets, Structural). Select a profile to see:

- All standard sizes with cross-section area and perimeter (mm)
- Formula used for cross-section area calculation
- EN standard reference

---

## Browse Materials

Searchable list of all material grades grouped by metal family. Select a grade to see:

- Density in kg/m³, kg/dm³, g/cm³, lb/ft³
- EN standard reference
- All `mat=` shortcut aliases that resolve to the grade

---

## Calculation History

Calculations from Quick Metal Weight are auto-saved after 1.5 s. From the history list you can:

- **Re-run** a query (fills the search bar in Quick Metal Weight)
- **View details** — full breakdown with all fields
- **Copy** query, weight (kg / lbs / t), linear density, surface area, or total price
- **Export** a single entry as JSON or Markdown
- **Delete** a single entry or clear all history
- **Bulk export** all entries as CSV

---

## Setup

```bash
# Install dependencies
npm install

# Dev mode (live reload in Raycast)
npm run dev

# Production build
npm run build

# Lint + format check (required before publishing)
npm run lint
```

Set `"author"` in `package.json` to your Raycast account handle before publishing.

---

## Troubleshooting

- **Parser rejects input** — start with a fully explicit query, e.g. `shs 40x40x4x6000mm qty=1 mat=steel`
- **Lint fails (invalid author)** — update `"author"` in `package.json` to your Raycast handle
- **Icon validation fails** — ensure `assets/icon.png` exists and all command `"icon"` fields are `"icon.png"`
- **Surface area not shown** — profile type does not have a computable perimeter (e.g. expanded metal, corrugated sheet)
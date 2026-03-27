# Icy Veins Quicklinks

A [Raycast](https://raycast.com) extension for instantly navigating to [Icy Veins](https://www.icy-veins.com/wow/) World of Warcraft class and spec guides.

I am experimenting with using LLM tools to build projects. This is one such experiment.

## Usage

Invoke the command by typing `iv` in Raycast. Pressing **Enter** with an empty query opens a staged grid: classes first, then specs, then `pve` / `pvp`, then the relevant sub-pages. You can still type a direct query like `sp pve gear` at any point, and the grid will jump to matching guides.

### Home grid

The empty-query grid shows up to three sections in order:

| Section | Description |
|---------|-------------|
| **Recent** | The last guide page you opened (1 slot) |
| **Favorites** | Your starred specs — up to 5 (see [Favorites](#favorites)) |
| **Classes** | All playable classes |

### Favorites

On any spec card, press **⌘K** to open the Action Panel and choose **"Add to Favorites"** (or **⌘F** directly). The spec immediately appears in the Favorites section on the home grid. Select the action again to remove it. Up to 5 favorites are stored.

### Stat Priority Copier

On any spec card, open the Action Panel and choose **"Copy Stat Priority"**. The extension fetches the spec's PvE guide, parses the stat priority list, and copies it to the clipboard (e.g. `Mastery > Critical Strike > Haste > Versatility`). Results are cached for 1 hour.

### Custom Macros

Define up to 5 personal text macros in the extension preferences (open via **"Manage Custom Macros"** in any Action Panel). Each macro has a name and body. On any spec page item, open the Action Panel to see your macros listed — selecting one copies it to the clipboard.

To open extension preferences at any time, use **"Manage Custom Macros"** from any Action Panel (⚙ gear icon).

### Query format

```
[spec] [mode] [page]
```

All parts are optional and can be typed in any order after the spec. The query is case-insensitive.

| Part | Examples |
|------|---------|
| **spec** | `sp`, `shadow priest`, `bdk`, `ww`, `ret` |
| **mode** | `pve`, `pvp` (defaults to PvE when omitted) |
| **page** | `gear`, `talents`, `rotation`, `guide` … |

### Examples

| You type | Opens |
|----------|-------|
| `sp pve gear` | Shadow Priest › PvE › Gear & Best in Slot |
| `bdk` | All Blood Death Knight guides (PvE + PvP) |
| `ret pve talents` | Retribution Paladin › PvE › Spec Builds & Talents |
| `aug pvp` | Augmentation Evoker › all PvP guides |
| `ww pvp comps` | Windwalker Monk › PvP › Best Arena Compositions |
| `sp pve lev` | Shadow Priest › Leveling Guide |
| `disc resources` | Discipline Priest › Resources |

### Faster invocation

For the quickest flow, type `iv` then press **Space**. Raycast enters inline argument mode — type your full query (e.g. `sp pve gear`), then press **Enter** to open the view with results already filtered.

### Copy Stat Priority

When browsing specs, select any spec card and open the Action Panel (**⌘K**). The **"Copy Stat Priority"** action fetches the Icy Veins stat priority page for that spec and copies the priority order (e.g. `Mastery > Critical Strike > Haste > Versatility`) directly to your clipboard — no browser required. Results are cached for 30 minutes.

---

## Supported specs

### Death Knight
| Spec | Short aliases |
|------|--------------|
| Blood | `bdk`, `blood dk` |
| Frost | `fdk`, `frost dk` |
| Unholy | `uhdk`, `uh dk`, `unholy dk` |

### Demon Hunter
| Spec | Short aliases |
|------|--------------|
| Devourer *(new)* | `devourer`, `devourer dh` |
| Havoc | `havoc`, `havoc dh` |
| Vengeance | `vdh`, `vengeance dh` |

### Druid
| Spec | Short aliases |
|------|--------------|
| Balance | `bala`, `boomkin`, `boomy`, `balance` |
| Feral | `feral`, `cat druid` |
| Guardian | `guardian`, `bear druid` |
| Restoration | `rdru`, `resto druid` |

### Evoker
| Spec | Short aliases |
|------|--------------|
| Augmentation | `aug`, `aug evoker` |
| Devastation | `dev`, `dev evoker` |
| Preservation | `pres`, `pres evoker` |

### Hunter
| Spec | Short aliases |
|------|--------------|
| Beast Mastery | `bm`, `bm hunter` |
| Marksmanship | `mm`, `mm hunter` |
| Survival | `surv`, `survival` |

### Mage
| Spec | Short aliases |
|------|--------------|
| Arcane | `arcane` |
| Fire | `fire` |
| Frost | `fmage`, `frost mag` |

### Monk
| Spec | Short aliases |
|------|--------------|
| Brewmaster | `brew`, `brew monk` |
| Mistweaver | `mw`, `mw monk` |
| Windwalker | `ww`, `ww monk` |

### Paladin
| Spec | Short aliases |
|------|--------------|
| Holy | `hpal`, `holy pala` |
| Protection | `prot pala`, `prot paladin` |
| Retribution | `ret`, `ret pala`, `ret paladin` |

### Priest
| Spec | Short aliases |
|------|--------------|
| Discipline | `disc`, `disc priest` |
| Holy | `hpriest`, `holy priest` |
| Shadow | `sp`, `shadow priest` |

### Rogue
| Spec | Short aliases |
|------|--------------|
| Assassination | `sin`, `sin rogue` |
| Outlaw | `outlaw` |
| Subtlety | `sub`, `sub rogue` |

### Shaman
| Spec | Short aliases |
|------|--------------|
| Elemental | `ele`, `ele shaman` |
| Enhancement | `enh`, `enh shaman` |
| Restoration | `rsham`, `resto shaman` |

### Warlock
| Spec | Short aliases |
|------|--------------|
| Affliction | `affli`, `affli warlock` |
| Demonology | `demo`, `demo warlock` |
| Destruction | `destro`, `destro warlock` |

### Warrior
| Spec | Short aliases |
|------|--------------|
| Arms | `arms` |
| Fury | `fury` |
| Protection | `prot war`, `prot warrior` |

---

## Available pages

### PvE
| Page | Aliases |
|------|---------|
| Guide (intro) | `guide`, `intro` *(or omit)* |
| Leveling Guide | `leveling` |
| Easy Mode | `easy` |
| Spec Builds & Talents | `talents`, `build` |
| Rotation, Cooldowns & Abilities | `rotation`, `cooldowns`, `abilities` |
| Stat Priority | `stats`, `priority` |
| Gems, Enchants & Consumables | `gems`, `enchants`, `consumables` |
| Gear & Best in Slot | `gear`, `bis` |
| Mythic+ Tips | `mythic`, `m+`, `tips` |
| Spell Summary | `spells`, `glossary` |

### PvP
| Page | Aliases |
|------|---------|
| PvP Guide (intro) | `guide`, `intro` *(or omit)* |
| Talents & Builds | `talents`, `build` |
| Gear & Trinkets | `gear`, `bis` |
| Rotation & Playstyle | `rotation`, `cooldowns`, `abilities` |
| Battleground Blitz | `bg`, `battleground`, `blitz` |
| Best Arena Compositions | `comps`, `comp`, `compositions` |
| Useful Macros | `macros` |
| Best Races & Racials | `races` |

### Any mode
| Page | Aliases |
|------|---------|
| Resources | `resources` |

---

## Development

```bash
npm install           # install dependencies
npm test              # run test suite (vitest)
npm run build         # build the extension
npm run lint          # lint + format check
npm run fix-lint      # auto-fix formatting
npm run dev           # start dev server (ray develop)
npm run generate-icons  # composite role badges onto spec icons (see below)
```

### Role icon generation

Spec icons displayed in the grid are pre-composited at build time — each base spec icon has a small role badge (DPS / Tank / Healer) composited into the bottom-right corner. The output is written to `assets/icons/with-role/` and committed to the repository.

**Re-run this script whenever:**
- A new spec is added to `src/data/specs.ts`
- The role badge images (`assets/icons/dps.png`, `tank.png`, `healer.png`) are replaced
- A spec's `pveRole` changes

```bash
npm run generate-icons
```

The script reads spec slugs and roles directly from `src/data/specs.ts`, then uses [sharp](https://sharp.pixelplumbing.com/) to composite each badge at 25% icon size with 25px margin. Commit the updated `assets/icons/with-role/` files after running.

### Project structure

```
src/
  iv.tsx                    # Raycast command entry point
  types.ts                  # shared TypeScript interfaces
  data/
    classes.ts              # all WoW classes with slugs and aliases
    specs.ts                # all 40 specs with slugs, aliases, and roles
    pages.ts                # PvE / PvP / any page definitions
  utils/
    urlBuilder.ts           # URL construction
    gridNavigation.ts       # query → grid state resolver
    suggestions.ts          # live autocomplete engine
    specMatcher.ts          # shared spec/class matching helpers
    text.ts                 # shared string utilities
    specUsage.ts            # tracks spec selection frequency
    statPriority.ts         # fetches and parses stat priority from guides
    favorites.ts            # LocalStorage-backed favorites
    recents.ts              # LocalStorage-backed recent guide entries
    macros.ts               # parses and expands custom macros
  __tests__/
    data.test.ts
    gridNavigation.test.ts
    suggestions.test.ts
    favorites.test.ts
    recents.test.ts
    macros.test.ts
assets/
  extension-icon.png        # Icy Veins favicon (512×512)
  icons/                    # per-spec WoW icons (40 × .jpg)
    with-role/              # composited icons with role badge (bottom-right)
    dps.png / tank.png / healer.png
scripts/
  generate-role-icons.mjs   # composites role badges onto spec icons (run via npm run generate-icons)
```

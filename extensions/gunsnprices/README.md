# GunsNPrices

Firearm and ammo helpers for Raycast. Search calibers by any spelling, read the specs out of a gun or ammo listing
title, and work out cost per round. Everything runs on your Mac or PC with data bundled in the extension: no
account, no API key, no network requests.

Powered by [`gunsnprices`](https://www.npmjs.com/package/gunsnprices), the open-source title parser behind the price
comparison site [GunsNPrices](https://gunsnprices.com).

## Commands

### Search Calibers

Search 293 calibers by the way stores write them: `9mm Luger`, `9x19`, `300 BLK`, `12 ga`, `6.5 CM`, `45 auto` and
`30-06` each find their caliber first. The detail pane shows the caliber type and the other spellings seen in store
listings.

- **Copy Caliber Name** (Enter) and **Paste Caliber Name** give the standard name, e.g. `9×19mm Parabellum`.
- **Open Price Comparison** (⌘O) opens the caliber's price comparison page on gunsnprices.com in your browser. This is
  the only action that goes online, and only when you choose it.

### Parse Product Title

Type or paste a listing title (and optionally a price) as arguments, or run the command without arguments to get a
form. For `Federal 9mm 115gr 50rd` with price `18.99`:

| Field | Value |
|---|---|
| Type | Ammo |
| Caliber | 9×19mm Parabellum |
| Rounds per box | 50 |
| Price | $18.99 |
| Cost per round | $0.38 |

For `Glock 19 Gen 5 MOS 9mm 4.02" 15rd Pistol` it finds brand Glock, model Glock 19 Gen 5 MOS (family Glock 19,
generation 5, configuration MOS), caliber 9×19mm Parabellum, capacity 15 rounds and a 4.02" barrel.

A price written in the title (`... 50rd $18.99`) is picked up too. Copy the result as a Markdown table or as JSON.

### Calculate Cost Per Round

Two arguments: the price, and either a round count or an ammo title.

- `18.99` and `50` → $0.38 per round, 38.0¢ per round, $37.98 per 100, $379.80 per 1,000
- `$289.99` and `Winchester 9mm 115gr FMJ 1000 Round Case` → 1,000 rounds read from the title, $0.29 per round

Each line can be copied rounded or as the exact value.

## Privacy

No network requests, no analytics, no telemetry. The extension reads only what you type into it.

## License

MIT. Caliber and model data from the `gunsnprices` package (CC BY 4.0, attribution: GunsNPrices).

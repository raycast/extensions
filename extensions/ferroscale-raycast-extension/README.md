# Ferroscale Raycast Extension

Quick one-line metal weight calculations powered by `@ferroscale/metal-core`.

## Prerequisites

1. Raycast app (macOS).
2. Repository dependencies installed from workspace root:

```bash
npm install
```

## Setup

1. Edit `package.json` in this folder.
2. Set `"author"` to your real Raycast handle.

## Run

```bash
# Start in dev mode (from repo root)
npm run dev --workspace raycast-extension

# Build extension package
npm run build --workspace raycast-extension

# Validate package, icons, ESLint, Prettier
npm run lint --workspace raycast-extension
```

## Command

1. Name: `Quick Metal Weight`
2. Argument: `query` (single shorthand string)
3. Output:
   1. Unit weight in kg
   2. Total weight in kg
   3. Copy actions for result values and normalized input

## Query Grammar

Manual profile format:
1. `<alias> <dimensions>x<length> [flags]`
2. For `sheet` and `plate`, both orders are accepted:
3. `width x thickness x length` and `width x length x thickness`

EN profile format:
1. `<alias> <size>x<length> [flags]`

## Common Aliases

1. `shs`, `rhs`, `chs`
2. `rb`, `sb`, `fb`, `angle`
3. `sheet`, `plate`, `chequered`, `expanded`, `corrugated`
4. `ipe`, `ipn`, `hea`, `heb`, `hem`, `upn`, `upe`, `tee`

## Examples

1. `shs 40x40x2x4500mm`
2. `rhs 120x80x4x6000 qty=2`
3. `ipe 200x6000 mat=s355`
4. `chs 60.3x3.2x3000 dens=8000`
5. `sheet 1250x3000x2 qty=5`
6. `plate 1500x3000x10`

## Flags

1. `qty=<number>` default `1`
2. `mat=<grade|alias>` default `steel-s235jr`
3. `dens=<kg/m3>` optional density override (takes precedence over `mat` density)
4. `unit=<mm|cm|m|in|ft>` fallback unit when dimension/length has no inline suffix

## Troubleshooting

1. If lint fails with invalid author, update `"author"` in `package.json`.
2. If icon validation fails, ensure `assets/icon.png` exists and command icon path is `icon.png`.
3. If parser rejects input, start with explicit alias and full dimensions, for example `shs 40x40x2x4500mm`.

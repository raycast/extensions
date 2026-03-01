# Percent Change (Raycast Extension)

Calculate percentage change and absolute change between two values.

## Features

- Calculates percentage change with sign and two decimals (for example, `+9.09%`).
- Calculates absolute change with compact formatting.
- Copy actions for both values from the action panel:
  - `Cmd + C`: Copy percentage change
  - `Cmd + Shift + C`: Copy absolute change
- Quick reset action:
  - `Cmd + Delete`: Clear input values

## How It Works

1. Enter a starting value.
2. Enter a final value.
3. Read the calculated output rows:
   - `Percentage Change`
   - `Absolute Change`
4. Press `Enter` on a copy action or use its shortcut.

## Input Validation

- If either input is invalid, percentage output shows `Invalid input`.
- If starting value is `0`, percentage output shows `Starting value cannot be 0`.

## Raycast UX Note

In Raycast `Form` views, description rows are display-only. Copy is performed through actions in the action panel, not by clicking the output text row directly.

## Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run fix-lint
npm run build
```

# Bopomofo Search Extension for Raycast

Search, translate, and insert Bopomofo symbols (注音符號) from Pinyin inside Raycast. Built for those familiar with the Pinyin input method who want a quick way to find and use Bopomofo characters.

## What It Does

The extension provides two commands:

- `Bopomofo Search`: find single symbols by pinyin
- `Pinyin to Bopomofo`: convert full pinyin strings to Bopomofo

Core features:

- Partial search (for example, typing `s` matches `ㄕ` and `ㄙ`)
- Multiple aliases per symbol (for example, `ㄩ` can be found with `u`, `v`, or `yu`)
- Full-string pinyin translation using longest-match parsing
- Tone mark input support (`1` `2` `3` `4` `5` -> `ˉ` `ˊ` `ˇ` `ˋ` `˙`)
- Configurable primary action (`Copy` or `Paste`) from extension preferences

## Command

| Command | Description |
| --- | --- |
| `Bopomofo Search` | Search by pinyin, then copy or paste a Bopomofo character |
| `Pinyin to Bopomofo` | Convert full pinyin text to Bopomofo |

## How To Use

### Bopomofo Search

1. Open Raycast.
2. Run `Bopomofo Search`.
3. Type pinyin in the search bar.
4. Select a result and press `Enter` to trigger your configured primary action.

### Pinyin to Bopomofo

1. Open Raycast.
2. Run `Pinyin to Bopomofo`.
3. Type a pinyin sequence (for example, `ni3hao3`).
4. Copy or paste the translated result from the actions.

## Actions & Shortcuts

- `Enter`: Primary action (default: `Paste into Active App`)
- `Cmd + C`: Copy to clipboard
- `Cmd/Ctrl + Shift + V`: Paste into active app

## Preferences

- `Primary Action`
  - `Paste into Active App` (default)
  - `Copy to Clipboard`

## Development

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

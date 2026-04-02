# Substitute Selected Text (Raycast)

A Raycast extension that applies a GNU sed substitution rule to currently selected text.

## Features

- Rule input in `/pattern/replacement/flags` format (leading `s` is optional)
- Custom delimiters (for example `#foo#bar#g`)
- Real-time preview powered by actual `gsed` execution
- Recent rules with dedupe-to-front and configurable history limit
- Rule history records both successful and failed apply attempts

## Requirements

- Raycast
- GNU sed available as `gsed`

Install GNU sed on macOS:

```bash
brew install gnu-sed
```

## Usage

1. Select text in your target application.
2. Trigger the `Substitute Selected Text` command.
3. Enter a rule like `/foo/bar/g`.
4. Check the live preview.
5. Submit `Apply Replacement` to paste the transformed text back.

## Preferences

- `History Limit` (default `10`): maximum number of recent rules retained.

## Development

```bash
npm install
npm test
npm run lint
npm run build
```

## CI

- GitHub Actions workflow `.github/workflows/unit-tests.yml` runs `npm test` on:
  - push to `main` and `feat/**`
  - pull requests targeting `main`

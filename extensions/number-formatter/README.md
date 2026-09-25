# Number Formatter

Make large and small numbers easier to read.

Number Formatter is a small quality-of-life Raycast extension for seeing numbers in formats that are easier to understand and share. Type or paste a number and copy the representation you need.

```text
1200000   → 1.2 million
1200000   → 1’200’000
0.0000012 → 1.2E-6
```

## Features

- See grouped, compact short, compact long, and scientific formats at once.
- Copy any result with Enter.
- Choose the system locale, English, German, French, Italian, or Spanish in command preferences.
- Adjust decimal detail in Raycast preferences.
- Paste numbers with commas, periods, spaces, or apostrophe grouping.
- Keep every calculation local and offline.

## Usage

1. Open **Format Number** in Raycast.
2. Type or paste a number in the search bar.
3. Optionally choose a locale from command preferences.
4. Select a result and press Enter to copy it.

## Supported Locales

- System default
- English (United States and United Kingdom)
- German (Germany and Switzerland)
- French (France)
- Italian (Italy)
- Spanish (Spain)

## Development

Requires Node.js 24 LTS or a newer LTS release, npm, and Raycast.

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

## Limitations

Number Formatter supports finite JavaScript numbers with up to approximately 15 significant digits. It intentionally does not provide arbitrary-precision decimals, currencies, percentages, calculations, or saved history.

## Contributing

Issues and focused pull requests are welcome. Please run the tests, linter, and production build before submitting a change.

## Privacy

Number formatting happens entirely on your device. The extension has no accounts, analytics, telemetry, or network requests.

## License

[MIT](LICENSE)

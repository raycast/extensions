# VAT Generator

A Raycast extension that generates valid-format (test) VAT numbers for countries worldwide.

Useful for filling out forms, seeding test data, and QA where you need a VAT number that looks real and matches the country's format.

## Features

- Search any supported country by name or VAT prefix.
- Generates a syntactically valid (fake/test) VAT number on demand.
- **Checksum-correct** numbers for countries with well-documented algorithms (NL, DE, BE, FR, IT, ES, AT, IE, LU, PL, SE, FI, DK, etc.).
- **Format-valid** numbers (correct prefix/length/pattern) for the remaining countries, clearly labeled.
- Actions: copy, regenerate, copy 5 variants, and paste into the active app.

## Disclaimer

These numbers are **randomly generated test data**. They are not registered to any real business and must not be used for actual tax or compliance purposes. "Checksum-correct" only means the number satisfies the country's check-digit algorithm, not that it is a real, assigned VAT identifier.

## Development

```bash
npm install
npm run dev
```

This loads the extension into Raycast in development mode.

## License

MIT

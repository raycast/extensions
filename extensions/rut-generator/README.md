# RUT Generator for Raycast

A Chilean RUT generator for Raycast.

Generates valid Chilean RUTs for development, testing, forms, seed data, and QA workflows.

<img width="896" height="606" alt="image" src="https://github.com/user-attachments/assets/19d8ace9-6421-4f69-92e1-6390f17ffff8" />

## Features

- Generates 10 valid Chilean RUTs at a time
- Copy a single RUT to the clipboard
- Copy the full list of generated RUTs
- Quickly regenerate the list
- Choose from common formats:
  - `12.345.678-5`
  - `12345678-5`
  - `123456785`

## Default Format

The default format is:

```txt
12.345.678-5
```

You can change the format from the command actions in Raycast.

## Development

Install dependencies:

```bash
npm install
```

Run the extension locally:

```bash
npm run dev
```

Run validations:

```bash
npm test
npm run typecheck
npm run lint
```

## License

MIT

# Codename

A Raycast extension that generates random codenames for your projects with full customization support.

## Features

- Generate random codenames with customizable formats
- Use placeholders like `{L}` (uppercase), `{l}` (lowercase), `{D}` (digits)
- Automatically copies the generated codename to your clipboard
- Shows a toast notification with the copied codename
- Super simple - just run it and get a codename

## Examples

**Default format (leave settings empty):**

- `NK-23`
- `LM-89`
- `OG-29`

**Custom formats (via extension preferences):**

- `PROJ-A123` (using `PROJ-{L}{D}{D}{D}`)
- `test-ab-456` (using `{l}{l}{l}-{d}{d}{d}`)
- `Code_XY99` (using `Code_{L}{L}{D}{D}`)

## Usage

1. Open Raycast
2. Search for "Generate Codename to Clipboard"
3. Press Enter to generate and copy a codename
4. That's it! The codename is ready in your clipboard

### Customization

Want different formats? Open Raycast preferences (⌘,) and find the Codename extension. Use the "Format Template" field with these placeholders:

- `{L}` = uppercase letter (A-Z)
- `{l}` = lowercase letter (a-z)
- `{D}` or `{d}` = digit (0-9)

Leave the field empty for the classic `XX-11` format.

## Inspiration

Originally inspired by [@vkbo/codename](https://www.npmjs.com/package/@vkbo/codename), a CLI tool for generating random codenames. This Raycast version adds customization and instant clipboard integration.

## License

MIT

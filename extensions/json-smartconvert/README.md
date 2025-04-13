# JSON-SmartConvert

![JSON-SmartConvert Logo](./assets/extension-icon.png)

A Raycast extension that provides smart JSON parsing and stringifying capabilities directly from your command bar.

## Features

- **Parse JSON**: Convert JSON strings to formatted JSON objects
- **Stringify JSON**: Convert JSON objects to compact string format
- **Smart Detection**: Automatically detects and handles JSON data
- **Clipboard Integration**: Works seamlessly with your clipboard content

## Usage

1. Copy JSON content to your clipboard
2. Open Raycast (default: `Option+Space`)
3. Search for one of the following commands:
   - `Parse JSON` - Format JSON string to object
   - `Stringify JSON` - Compact JSON object to string
4. The converted result will be copied to your clipboard and displayed in the UI

## Examples

### Parse JSON

Before:
```
{"name":"JSON-SmartConvert","version":"1.0.0","description":"Smart JSON conversion","author":"Sachin"}
```

After:
```json
{
  "name": "JSON-SmartConvert",
  "version": "1.0.0",
  "description": "Smart JSON conversion",
  "author": "Sachin"
}
```

### Stringify JSON

Before:
```json
{
  "name": "JSON-SmartConvert",
  "version": "1.0.0",
  "description": "Smart JSON conversion",
  "author": "Sachin"
}
```

After:
```
{"name":"JSON-SmartConvert","version":"1.0.0","description":"Smart JSON conversion","author":"Sachin"}
```

## Installation

1. Install [Raycast](https://raycast.com/)
2. Open Raycast and search for "Extensions"
3. Click "Store" and search for "JSON-SmartConvert"
4. Click "Install"

Alternatively, you can install it directly from the [Raycast Store](https://raycast.com/store).

## Configuration

The extension works out of the box with default settings. Additional configuration options may be available in future releases.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
# Brotli

A Raycast extension for compressing and decompressing text using the Brotli algorithm. Perfect for developers who need to quickly compress large text data or decompress Brotli-compressed content.

## Commands

### Compress Text

- **Function**: Compresses selected text or clipboard content using Brotli
- **Output**: Base64 encoded compressed string copied to clipboard

### Decompress Text

- **Function**: Decompresses Brotli-compressed base64 text with live preview
- **Output**: Formatted text display with syntax highlighting

## Usage

### Compressing Text

1. Select text in any application or copy it to clipboard
2. Run "Compress Text" command
3. Compressed base64 string is automatically copied to clipboard
4. Toast notification shows compression statistics

### Decompressing Text

1. Select or copy base64 encoded Brotli-compressed text
2. Run "Decompress Text" command
3. View decompressed content with syntax highlighting
4. See compression statistics in the metadata panel

## Technical Details

- **Algorithm**: Brotli compression (RFC 7932)
- **Encoding**: Base64 for text representation
- **Node.js**: Uses built-in `zlib.brotliCompressSync` and `zlib.brotliDecompressSync`

## Installation

1. Install from Raycast Store (when published)
2. Or manually install:
   ```bash
   git clone <repository>
   cd brotli
   npm install
   npm run build
   ```

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## Requirements

- Raycast (latest version)
- Node.js ≥22.14.0
- macOS

## License

MIT License

### Planned Features

- File compression/decompression support
- Batch processing capabilities

---

https://github.com/carlossgabriel

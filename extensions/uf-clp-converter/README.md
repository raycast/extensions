# UF to CLP Converter

A Raycast extension to quickly convert between UF (Unidad de Fomento) and CLP (Chilean Peso) using real-time UF values from [mindicador.cl](https://mindicador.cl/).

## Features

- 🔄 **Bidirectional conversion**: Convert UF to CLP or CLP to UF
- 📊 **Real-time UF values**: Fetches current UF value from mindicador.cl API
- 💾 **Smart caching**: Caches UF value for 24 hours to minimize API calls
- 📋 **Quick copy**: Press Enter on any result to copy it to clipboard
- 🔍 **Smart input parsing**: Automatically detects conversion direction or shows both

## Usage

1. Open Raycast and search for "Convert UF/CLP"
2. Type an amount:
   - `1000` - Shows both conversions
   - `1.5 UF` - Converts UF to CLP
   - `50000 CLP` - Converts CLP to UF
3. Press Enter on any result to copy it to clipboard

## Examples

- `1000` → Shows both 1000 UF and 1000 CLP conversions
- `1.5 UF` → Converts 1.5 UF to CLP
- `50000 CLP` → Converts 50,000 CLP to UF

## Data Source

UF values are fetched from [mindicador.cl](https://mindicador.cl/api/uf), a free and open-source API providing daily economic indicators for Chile.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint
```

## Publishing to Raycast Store

Before publishing, make sure:

1. **You have a Raycast account** - Sign up at [raycast.com](https://raycast.com) if you haven't already
2. **You're logged in** - Run `ray login` in your terminal to authenticate
3. **Extension is ready**:
   - ✅ All code is tested and working
   - ✅ Icon is properly set (`assets/icon.png`)
   - ✅ `package.json` has correct metadata
   - ✅ Build passes (`pnpm build`)
   - ✅ Lint passes (`pnpm lint`)

Then publish with:

```bash
pnpm publish
```

This will:
- Validate your extension
- Build the production version
- Submit to Raycast Store for review

**Review Process:**
- Raycast team typically reviews within 1-2 business days
- Once approved, your extension will be available in the Raycast Store
- Users can install it directly from Raycast

## License

MIT


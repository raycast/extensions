# Radix

Search and open Radix content directly from Raycast.

## Commands

- **Radix Primitives** - Browse Radix Primitives components and documentation
- **Radix Themes** - Browse Radix Themes components and documentation
- **Radix Colors** - Browse Radix Colors documentation

## Development

### Setup

```bash
npm install
npm run clone    # Clone Radix website repository
npm run generate # Generate component data from website
```

### Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build the extension
- `npm run clone` - Clone the Radix website repository
- `npm run generate` - Generate JSON data files from MDX documentation (need node 22+)

### Data Generation

You need node 22+ to run .ts files during generation.

Run `clone` to get latest radix docs site, then run `generate` to update plugin docs in `src/data.{name}.json`.

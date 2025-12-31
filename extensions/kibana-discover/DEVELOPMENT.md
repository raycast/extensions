# Development Guide

This guide is for developers who want to work on the Kibana Discover extension.

## Prerequisites

1. **Raycast** installed on macOS
2. **Node.js** and npm (v16 or higher recommended)
3. Basic knowledge of TypeScript and React

## Setup

### Clone and Install

```bash
cd /path/to/kibana-discover
npm install
```

### Development Mode

Start the development server with hot-reload:

```bash
npm run dev
```

This opens the extension in Raycast development mode. The extension will automatically reload when you save changes to TypeScript files.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Project Structure

```
kibana-discover/
├── package.json                    # Extension manifest & preferences
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # User documentation
├── DEVELOPMENT.md                  # This file
├── CONTRIBUTING.md                 # Contribution guidelines
├── CHANGELOG.md                    # Version history
├── assets/
│   └── command-icon.png           # Extension icon
├── metadata/
│   ├── Refresh data-views.png     # Command screenshot
│   └── Search data-views.png      # Command screenshot
├── src/
│   ├── search.tsx                 # Main search UI command
│   ├── index.tsx                  # Refresh command
│   ├── types.ts                   # TypeScript type definitions
│   ├── components/
│   │   ├── SetQueryForm.tsx       # Query input form
│   │   └── EmptyView.tsx          # Empty state view
│   └── tools/
│       ├── cache.ts               # Cache management utilities
│       ├── constants.ts           # App constants
│       ├── helpers.ts             # Helper functions
│       ├── kibana-api.ts          # Kibana API client
│       ├── url-builder.ts         # Discover URL builder
│       └── validation.ts          # Config validation
└── node_modules/                   # Dependencies
```

## Tech Stack

- **TypeScript** - Type-safe development
- **React** - UI components
- **@raycast/api** - Raycast extension API
- **Node.js HTTPS/HTTP** - API communication
- **LocalStorage API** - User preferences persistence
- **File System** - Cache management

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Raycast Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search Data-Views (search.tsx)                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ - Load cache from disk                                │ │
│  │ - Display data views in list                          │ │
│  │ - Live filtering as you type                          │ │
│  │ - Instance dropdown selector                          │ │
│  │ - Configure time range, columns, query                │ │
│  │ - Build Kibana Discover URL                           │ │
│  │ - Open in browser                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Refresh Data-Views (index.tsx)                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ - Read preferences (instances config)                 │ │
│  │ - Fetch data views from Kibana API                    │ │
│  │ - Merge with existing cache                           │ │
│  │ - Save to disk                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │   Local Cache (JSON)        │
              │   Multi-Instance Format:    │
              │   {                         │
              │     "Production": {         │
              │       instance: {...},      │
              │       dataViews: [...]      │
              │     },                      │
              │     "Staging": {            │
              │       instance: {...},      │
              │       dataViews: [...]      │
              │     }                       │
              │   }                         │
              └─────────────────────────────┘
```

## Development Workflow

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Make Changes

Edit files in the `src/` directory. The extension will automatically rebuild and reload.

### 3. Test Changes

- Test in Raycast immediately
- Use `console.log()` for debugging (appears in Raycast Developer Console)
- Press `⌘R` in Raycast to reload the extension manually

### 4. Check for Issues

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run fix-lint
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build production version to `dist/` |
| `npm run lint` | Run ESLint and Prettier checks |
| `npm run fix-lint` | Auto-fix ESLint and Prettier issues |
| `npm run publish` | Publish to Raycast Store |

## Cache Structure

### Location

```
~/Library/Application Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

### Format

```json
{
  "Production - Environment": {
    "instance": {
      "name": "Production - Environment",
      "url": "https://production-kibana.example.com",
      "commonFields": ["TraceId", "message", "MachineName", "level", "logger"]
    },
    "dataViews": [
      {
        "number": 1,
        "name": "logs-production-2024",
        "title": "logs-production-*",
        "id": "3e1bdc71-ba6d-4abe-834b-60f80ad0d736"
      }
    ]
  },
  "Staging Environment": {
    "instance": { ... },
    "dataViews": [ ... ]
  }
}
```

### Cache Management

**View Cache:**
```bash
cat ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

**Delete Cache:**
```bash
rm ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

**Backup Cache:**
```bash
cp ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json \
   ~/Desktop/kibana-discover-cache-backup.json
```

**Restore Cache:**
```bash
cp ~/Desktop/kibana-discover-cache-backup.json \
   ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

## Customization

### Default Fields

Edit `DEFAULT_FIELDS` in `src/tools/constants.ts`:

```typescript
export const DEFAULT_FIELDS = ["TraceId", "message"];  // Change these
```

### Time Ranges

Edit `TIME_RANGES` in `src/tools/constants.ts`:

```typescript
export const TIME_RANGES: TimeRange[] = [
  { label: "Last 5 minutes", from: "now-5m", to: "now" },  // Add custom ranges
  { label: "Last 15 minutes", from: "now-15m", to: "now" },
  // ...
];
```

### Default Time Range

Edit `DEFAULT_TIME_RANGE` in `src/tools/constants.ts`:

```typescript
export const DEFAULT_TIME_RANGE = "Last 15 minutes";  // Change default
```

### Common Fields

Edit `COMMON_FIELDS` in `src/tools/constants.ts`:

```typescript
export const COMMON_FIELDS = [
  "TraceId",
  "message",
  "your-custom-field",  // Add your fields
  // ...
];
```

### Icon Logic

Edit `getDataViewIcon()` in `src/tools/helpers.ts`:

```typescript
export function getDataViewIcon(dataViewName: string): Icon {
  const lowerName = dataViewName.toLowerCase();
  if (lowerName.includes("production") || lowerName.includes("prod")) {
    return Icon.Crown;
  }
  if (lowerName.includes("staging")) {
    return Icon.Star;  // Add custom logic
  }
  return Icon.Gear;
}
```

## Debugging

### Console Logs

Use `console.log()`, `console.error()`, etc. in your code. Output appears in:

1. Terminal where `npm run dev` is running
2. Raycast Developer Console (⌘⌥I in Raycast)

### Common Issues

**Extension Doesn't Appear:**
1. Make sure `npm run dev` is running
2. Check terminal for build errors
3. Restart Raycast (`⌘Q` then reopen)

**TypeScript Warnings:**
Some React type warnings are normal:
```
Type '{ children: Element; }' has no properties in common with type 'IntrinsicAttributes'
```
These can be safely ignored.

**Dev Server Crashes (Exit Code 137):**
```bash
# Stop existing dev servers
pkill -f "ray develop"

# Restart
npm run dev
```

**Hot Reload Not Working:**
Press `⌘R` in Raycast to manually reload the extension.

## Testing

### Manual Testing Checklist

Before submitting changes:

- [ ] Test with single instance
- [ ] Test with multiple instances
- [ ] Test instance switching
- [ ] Test time range selection
- [ ] Test field selection
- [ ] Test query input
- [ ] Test copy actions
- [ ] Test detail view toggle
- [ ] Test cache refresh
- [ ] Test with invalid config
- [ ] Test with no cache
- [ ] Test authentication (Basic Auth and API Key)

### Browser Testing

Test generated Discover URLs by opening them in a browser and verifying:
- Correct data view loads
- Selected fields appear as columns
- Time range is correct
- Query is applied

## Code Style

### Linting

This project uses ESLint and Prettier for code quality:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run fix-lint
```

### TypeScript

- Use TypeScript types for all functions and variables
- Define types in `src/types.ts`
- Avoid `any` type when possible

### React Best Practices

- Use functional components
- Use hooks (`useState`, `useEffect`)
- Keep components small and focused
- Extract reusable logic into custom hooks

## Publishing

See [CONTRIBUTING.md](CONTRIBUTING.md) for publishing guidelines.

## Troubleshooting Development Issues

### Node Modules Issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### Cache Issues During Development

```bash
rm ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

### TypeScript Errors

```bash
npm run build
```

Check terminal output for specific errors.

### Raycast Not Loading Extension

1. Quit Raycast completely (`⌘Q`)
2. Kill any running dev servers
3. Restart dev server: `npm run dev`
4. Reopen Raycast

## Resources

- [Raycast API Documentation](https://developers.raycast.com/)
- [Raycast Extension Examples](https://github.com/raycast/extensions)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Kibana API Documentation](https://www.elastic.co/guide/en/kibana/current/api.html)

## Support

If you encounter issues during development:

1. Check this guide
2. Check [CONTRIBUTING.md](CONTRIBUTING.md)
3. Check [GitHub Issues](https://github.com/YOUR-USERNAME/kibana-discover/issues)
4. Open a new issue with:
   - Node.js version
   - npm version
   - Error messages
   - Steps to reproduce

---

Happy coding! 🚀

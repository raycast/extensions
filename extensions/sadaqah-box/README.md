<h1 align="center"><img align="left" src="assets/extension-icon.png" width="48" alt="Sadaqah Box icon"><a href="https://erklab.com"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/erklab-logo-white.svg"><img align="right" src="assets/erklab-logo.svg" width="112" alt="erklab"></picture></a>Sadaqah Box</h1>

<p align="center"><strong>Track your charity boxes and sadaqahs directly from Raycast.</strong><br>
Multi-currency support, quick-add presets, and automatic gold value conversion.</p>

<p align="center"><strong>Sponsored by <a href="https://erklab.com">erklab</a></strong> — Architecting production-grade systems with AI-driven velocity and human-centered precision.<br>
<sub>Built for macOS &amp; Windows with Raycast API, TypeScript, and Better Auth.</sub></p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9-blue.svg" alt="TypeScript"></a>
  <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-19-61dafb.svg" alt="React"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-red.svg" alt="License"></a>
</p>

<!-- /header -->

## Demo

<div align="center">
  <img src="assets/demo.gif" alt="Sadaqah Box Demo" width="720">
</div>

---

## Features

### 📦 Box Management
- **Create Boxes**: Organize your sadaqahs into different boxes (e.g., "Ramadan Charity", "Daily Sadaqah")
- **Track Progress**: Monitor total value, count, and currency breakdown for each box
- **Multi-Currency Support**: Handle donations in different currencies with automatic conversion tracking

### ⚡ Quick Actions
- **Presets**: Define preset amounts for quick donation recording (e.g., "Daily Sadaqah - 0.1g Gold")
- **Keyboard Shortcuts**: `⌘⇧1-5` for quick preset access
- **Default Preset**: Set a preset as default for one-click adding

### 📊 Statistics & Reporting
- **Dashboard Overview**: Total boxes, sadaqahs, and value across all boxes
- **Collection Receipts**: Generate beautiful markdown receipts when emptying boxes
- **Historical Data**: Track all collections and their values over time

### 🔐 Security & Performance
- **Input Validation**: All inputs validated with Zod schemas
- **Request Timeouts**: 30-second timeout with retry logic
- **API Response Caching**: Intelligent caching to reduce API calls
- **Secure Error Handling**: User-friendly error messages without exposing internals
- **Cryptographically Secure IDs**: Using `crypto.randomUUID()` for ID generation

## Installation

### Prerequisites
- Raycast installed on macOS or Windows
- [Bun](https://bun.sh/) installed
- Access to a SadaqahBox API instance

### Setup

1. Clone this repository:
```bash
git clone <repository-url>
cd sadaqahbox-raycast-extension
```

2. Install dependencies:
```bash
bun install
```

3. Configure the extension in Raycast:
   - Open Raycast Preferences
   - Go to Extensions → Sadaqah Box
   - Set the following preferences:
     - **API Host**: Your SadaqahBox API URL (e.g., `https://api.yourdomain.com`)
     - **API Key**: Your Better Auth API key

4. Build and install:
```bash
bun run build
```

## Configuration

### Extension Preferences

| Setting | Description | Required |
|---------|-------------|----------|
| API Host | Base URL of your SadaqahBox API | Yes |
| API Key | Better Auth API key for authentication | Yes |

### Getting an API Key

1. Log in to your SadaqahBox web application
2. Navigate to Settings → API Keys
3. Generate a new API key
4. Copy the key and paste it into Raycast preferences

## Commands

### Dashboard
**Command**: `Dashboard`

Main interface for managing your sadaqah boxes:
- View all boxes with their statistics
- Quick add using presets (⌘⇧1-5)
- Open box details
- Collect/empty boxes
- Delete boxes

### Manage Presets
**Command**: `Manage Presets`

Configure quick-add presets:
- Create preset amounts with names and currencies
- Set default preset for one-click adding
- Reorder presets (⌘⇧↑/↓)
- Delete unused presets

## Architecture

```
src/
├── api/
│   ├── client.ts          # Base HTTP client with timeout & safe GET retry
│   ├── index.ts           # API endpoint functions
│   └── cached.ts          # Host-scoped cached API wrappers
├── constants/
│   └── index.ts           # App constants & configuration
├── hooks/
│   ├── useBoxActions.ts   # Shared delete & collect box confirmation flows
│   └── useCurrencies.ts   # Shared currency fetching hook
├── storage/
│   └── presets-storage.ts # Validated LocalStorage for presets
├── utils/
│   ├── cache.ts           # Raycast Cache utilities
│   ├── error-handler.ts   # Error categorization & sanitization
│   ├── format.ts          # Shared currency, number & date formatters
│   ├── security.ts        # Secure ID generation & URL sanitization
│   └── type-guards.ts     # Runtime type checking
├── validation/
│   └── schemas.ts         # Zod validation schemas & field error mapping
├── views/
│   ├── AddSadaqahForm.tsx # Add sadaqah form
│   ├── BoxDetail.tsx      # Box detail view
│   ├── CollectionDetail.tsx # Collection receipt view
│   ├── CreateBoxForm.tsx  # Create box form
│   ├── EditBoxForm.tsx    # Edit box form
│   └── PresetForm.tsx     # Unified create/edit preset form
├── data/
│   ├── quotes.json        # Quranic verses & Hadith on sadaqah
│   └── quotes.ts          # Quote types & utilities
├── services/
│   └── quote-service.ts   # Random quote helpers
├── dashboard.tsx          # Main dashboard command
├── manage-presets.tsx     # Preset management command
├── auth-client.ts         # Better Auth client setup
└── types.ts               # TypeScript type definitions
```

## API Integration

The extension communicates with a SadaqahBox backend API. All API calls include:

- **Authentication**: API key via `x-api-key` header
- **Timeout Protection**: 30-second request timeout with AbortController
- **Retry Logic**: Automatic retry on timeout errors
- **Response Caching**: Intelligent caching to minimize API calls

### Cache Strategy

| Endpoint | Cache TTL | Invalidation |
|----------|-----------|--------------|
| List Boxes | 5 minutes | On create/update/delete |
| Get Box | 5 minutes | On update/delete |
| Stats | 2 minutes | On any mutation |
| Currencies | 1 hour | On currency changes |
| Currency Types | 1 hour | On type changes |
| Sadaqahs | No cache | Real-time data |
| Collections | No cache | Real-time data |

## Development

### Available Scripts

```bash
# Development mode with hot reload
bun run dev

# Build for production
bun run build

# Run unit tests
bun test

# Type-check TypeScript
bun run typecheck

# Run linting
bun run lint

# Fix linting issues
bun run fix-lint

# Publish to Raycast Store
bun run publish
```

### Project Structure

- **Components**: Each command is a separate React component
- **API Layer**: Modular API functions with separation of concerns
- **Utilities**: Shared utilities for caching, errors, and security
- **Validation**: Centralized Zod schemas for input validation

### Adding New Features

1. **New API Endpoint**: Add to `src/api/index.ts` and wrap in `src/api/cached.ts`
2. **New Form**: Use `validation/schemas.ts` for validation
3. **New Command**: Create component in `src/` and register in `package.json`

## Security Considerations

### Input Validation
All user inputs are validated using Zod schemas:
- String length limits
- Numeric range validation
- Required field checking
- Type coercion with validation

### Error Handling
- Raw errors are logged internally
- User-facing messages are sanitized
- Error categorization (network, timeout, auth, etc.)

### ID Generation
- Cryptographically secure UUID generation
- No predictable IDs from timestamps

### Data Sanitization
- Input sanitization to prevent XSS
- URL validation for API endpoints

## Troubleshooting

### Common Issues

**"API Key is not configured"**
- Check Raycast preferences for the extension
- Ensure API key is copied correctly

**"Request timed out"**
- Check internet connection
- Verify API host URL is correct
- API server may be slow/unresponsive

**"Failed to load data"**
- Verify API key has correct permissions
- Check API server is running
- Look at Raycast logs for details

### Debug Mode

To see detailed error logs:
1. Open Raycast
2. Run "Toggle Debug Mode" command
3. Reproduce the issue
4. Check Raycast logs

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Sponsored by [erklab](https://erklab.com)
- Quranic verses and Hadith provided for inspiration
- Built with [Raycast API](https://developers.raycast.com/)
- Authentication powered by [Better Auth](https://www.better-auth.com/)

---

<p align="center">
  May your sadaqah be accepted 🤲
</p>

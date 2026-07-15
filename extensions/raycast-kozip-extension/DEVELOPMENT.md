# Development Guide

English | [한국어](DEVELOPMENT.md)

Comprehensive development guide for the KoZip extension.

## Project Structure

```
src/
├── kz.tsx              # Main extension logic
└── locales/            # Internationalization
    ├── index.ts        # Locale utilities
    ├── ko.json         # Korean strings
    └── en.json         # English strings
assets/
├── icon.png           # Extension icon (light mode)
└── icon@dark.png      # Extension icon (dark mode)
```

## Development Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Raycast app installed

### Setup Steps
```bash
# Clone repository
git clone https://github.com/kyungw00k/raycast-kozip-extension.git
cd raycast-kozip-extension

# Install dependencies
npm install

# Start development mode
npm run dev
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development with hot reload |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint checks |
| `npm run fix-lint` | Auto-fix lint issues |
| `npm run publish` | Publish to Raycast Store |

## Architecture

### Core Components

#### Command()
- Main search interface component
- Search text debouncing (500ms)
- Cache management and API call control

#### SearchListItem()
- Individual address result rendering
- Road/lot address toggle functionality
- Action panel (copy, map integration)

#### getLocalizedStrings()
- Dynamic locale loading
- Fallback mechanism (Korean → English)
- Runtime locale detection

#### parseFetchResponse()
- API response parsing and transformation
- Error handling
- Address format normalization

### State Management

```typescript
// Search-related state
const [searchText, setSearchText] = useState("");
const [debouncedSearchText, setDebouncedSearchText] = useState("");

// UI state
const [showJibunAddress, setShowJibunAddress] = useState(false);

// Cache state
const [cachedData, setCachedData] = useState<AddressResult[] | null>(null);
```

## API Integration

### Postcodify API
- **Endpoint**: `https://api.poesis.kr/post/search.php`
- **Parameter**: `q` (search query, NFC normalized)
- **Response**: JSON array of addresses

### Request Flow
1. Search input → Debouncing (500ms)
2. Cache check (24-hour TTL)
3. API call on cache miss
4. Response parsing and cache storage
5. UI update

## Caching System

### Cache Strategy
```typescript
interface CacheEntry {
  data: AddressResult[];
  timestamp: number;
  expiresAt: number;
}

// Cache key: normalized search query (lowercase)
const cacheKey = searchText.normalize("NFC").toLowerCase();
```

### Cache Management
- **TTL**: 24 hours
- **Storage**: Raycast LocalStorage
- **Cleanup**: Automatic expiry checking

## Internationalization (i18n)

### Supported Languages
- Korean (`ko.json`)
- English (`en.json`)

### Adding New Languages

1. Create new locale file:
```bash
cp src/locales/en.json src/locales/ja.json
```

2. Translate strings:
```json
{
  "searchPlaceholder": "Search Korean addresses...",
  "resultsTitle": "Search Results",
  "copyKoreanAddress": "Copy Korean Address",
  "copyEnglishAddress": "Copy English Address",
  "noAddressInfo": "No address information"
}
```

3. Automatic detection and loading (no code changes required)

### Locale Fallback
```
User locale → Korean → English → Default
```

## Type Definitions

### AddressResult
```typescript
interface AddressResult {
  id: string;
  postcode5: string;           // 5-digit postal code
  postcode6: string;           // 6-digit postal code
  ko_doro: string;             // Korean road name
  ko_jibeon: string;           // Korean lot number
  en_doro: string;             // English road name
  en_jibeon: string;           // English lot number
  full_ko_doro: string;        // Full Korean road address
  full_ko_jibeon: string;      // Full Korean lot address
  full_en_doro: string;        // Full English road address
  full_en_jibeon: string;      // Full English lot address
  full_ko_doro_with_postal: string;    // Korean road with postal
  full_ko_jibeon_with_postal: string;  // Korean lot with postal
  full_en_doro_with_postal: string;    // English road with postal
  full_en_jibeon_with_postal: string;  // English lot with postal
  building_name?: string;      // Building name (optional)
}
```

## Testing

### Manual Testing Scenarios
1. **Basic Search**: Search "Gangnam Station"
2. **Building Search**: Search "Lotte Tower"
3. **Postal Code Search**: Search "06292"
4. **English Search**: Search "Seoul"
5. **Cache Test**: Repeat same search query
6. **Address Toggle**: Road ↔ Lot address switching
7. **Copy Function**: Various format copying
8. **Map Integration**: Open Kakao Map/Naver Map

### Performance Testing
- Search response time < 2 seconds
- Cache hit response time < 100ms
- Memory usage monitoring

## Coding Standards

### TypeScript Configuration
```json
{
  "strict": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### ESLint Rules
- Raycast extension recommended settings
- React Hooks rules
- TypeScript strict mode

### Code Style
- Prettier auto-formatting
- 2-space indentation
- Semicolons required
- Single quotes preferred

## Build and Deploy

### Local Build
```bash
npm run build
```

### Store Publishing
```bash
npm run publish
```

### Version Management
- Follow [Semantic Versioning](https://semver.org/)
- Update version in `package.json`
- Tag releases with Git

## Troubleshooting

### Common Issues

#### Cache Issues
```bash
# Clear Raycast cache
rm -rf ~/Library/Caches/com.raycast.macos
```

#### Development Mode Issues
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### API Response Errors
- Check network connection
- Verify API endpoint status
- Check search query encoding

### Debugging

#### Log Checking
```javascript
console.log("Search query:", debouncedSearchText);
console.log("API response:", data);
console.log("Cache hit:", cachedData !== null);
```

#### Developer Tools
- Enable Raycast developer mode
- Reload extension: `⌘ + R`
- Open developer console

## Contribution Guide

### Pull Request Process
1. Create feature branch
2. Make changes and add tests
3. Check linting and formatting
4. Write commit message (Conventional Commits)
5. Create PR and request review

### Commit Message Format
```
type(scope): description

body

footer
```

Example:
```
feat(search): add building name display in results

- Show building names in subtitle when available
- Improve address information visibility
- Maintain backward compatibility

Closes #123
```

## Resources

- [Raycast API Documentation](https://developers.raycast.com/api-reference)
- [Postcodify API Documentation](https://postcodify.poesis.kr/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hooks Guide](https://reactjs.org/docs/hooks-intro.html)
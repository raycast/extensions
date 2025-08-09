# KoZip - Korean Postal Code Search for Raycast

한국어 | [English](README.en.md)

A Raycast extension for searching Korean addresses using the Postcodify API. Quickly find and copy Korean addresses in multiple formats with multilingual support.

## Features

- 🔍 **Fast Korean Address Search** - Search Korean addresses with real-time results
- 🌐 **Multilingual Support** - Korean and English address formats
- 📋 **Multiple Copy Options** - Copy addresses in different formats
- 🗺️ **Map Integration** - Open addresses in Kakao Map or Naver Map
- 🚀 **Performance** - Intelligent caching for faster repeated searches
- 🌍 **Internationalization** - Dynamic locale loading with fallback support

## Installation

1. Install the extension from the [Raycast Store](https://raycast.com/store)
2. Or install locally:

   ```bash
   git clone https://github.com/kyungw00k/raycast-kozip-extension.git
   cd raycast-korea-zipcode-finder
   npm install
   npm run dev
   ```

## Usage

1. Open Raycast and type `kz` or "KoZip"
2. Enter your search query (Korean address, building name, or postal code)
3. Browse results and use keyboard shortcuts for different actions:

### Keyboard Shortcuts

- **Enter**: Copy Korean road address with postal code
- **⌘ + C**: Copy English road address with postal code
- **⌘ + T**: Toggle between road address and jibun (lot) address
- **⌘ + O**: Open in Kakao Map
- **⌘ + ⇧ + O**: Open in Naver Map

## Address Formats

The extension provides addresses in multiple formats:

### Korean Formats

- **Road Address (도로명)**: `(12345) 서울특별시 강남구 테헤란로 123`
- **Jibun Address (지번)**: `(12345) 서울특별시 강남구 역삼동 123-45`

### English Formats

- **Road Address**: `123 Teheran-ro, Gangnam-gu, Seoul (12345)`
- **Jibun Address**: `123-45 Yeoksam-dong, Gangnam-gu, Seoul (12345)`

## Architecture

### Project Structure

```text
src/
├── kz.tsx              # Main extension logic
└── locales/            # Internationalization
    ├── index.ts        # Locale utilities
    ├── ko.json         # Korean strings
    └── en.json         # English strings
```

### Key Components

- **Command()**: Main search interface component
- **SearchListItem()**: Individual address result component
- **getLocalizedStrings()**: Dynamic locale loading with fallback
- **parseFetchResponse()**: API response parser

## Adding New Languages

To add support for a new language:

1. Create a new locale file: `src/locales/{language-code}.json`
2. Copy the structure from `en.json` and translate the strings
3. The extension will automatically detect and load the new locale

Example for Japanese (`ja.json`):

```json
{
  "searchPlaceholder": "韓国の住所を検索...",
  "resultsTitle": "検索結果",
  "copyKoreanAddress": "韓国住所をコピー",
  ...
}
```

## API Integration

Uses the [Postcodify API](https://postcodify.poesis.kr/) for address data:

- **Endpoint**: `https://api.poesis.kr/post/search.php`
- **Features**: Real-time search, Korean/English results, building names
- **Caching**: 24-hour local cache for improved performance

## Development

### Setup

```bash
npm install
npm run dev
```

### Commands

- `npm run dev` - Start development with hot reload
- `npm run build` - Build for production
- `npm run lint` - Run ESLint checks
- `npm run fix-lint` - Fix linting issues
- `npm run publish` - Publish to Raycast Store

### Technology Stack

- **Raycast API**: Extension framework
- **TypeScript**: Type-safe development
- **React Hooks**: State management
- **Postcodify API**: Address data source

## Cache Management

The extension implements intelligent caching:

- **Duration**: 24 hours per search query
- **Storage**: Local storage with automatic cleanup
- **Benefits**: Faster repeated searches, reduced API calls

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Commit with descriptive messages
5. Push and create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

- **API**: [Postcodify](https://postcodify.poesis.kr/) by Poesis
- **Maps**: Kakao Map, Naver Map integration
- **Icon**: Based on [Korea Post Emblem](https://ko.m.wikipedia.org/wiki/%ED%8C%8C%EC%9D%BC:Emblem_of_Korea_Post.svg)
- **Author**: [kyungw00k](https://github.com/kyungw00k)

## Support

If you encounter issues or have suggestions:

1. Check existing [issues](https://github.com/kyungw00k/raycast-kozip-extension/issues)
2. Create a new issue with detailed information
3. For feature requests, use the enhancement label
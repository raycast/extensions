# KoZip - Korean Postal Code Search for Raycast

English | [한국어](README.ko.md)

A Raycast extension for searching South Korean addresses using the Postcodify API. Quickly find and copy addresses in multiple formats.

## Features

- 🔍 **Fast address search**: Real-time search results for Korean addresses
- 📋 **Multiple copy options**: Copy in different formats
- 🗺️ **Map integration**: Open in Kakao Map or Naver Map
- 🚀 **Performance**: Smart caching for fast repeated searches

## Installation

1. Install from the [Raycast Store](https://raycast.com/store)
2. Or install locally:
   ```bash
   git clone https://github.com/kyungw00k/raycast-kozip-extension.git
   cd raycast-kozip-extension
   npm install
   npm run dev
   ```

## Usage

1. Open Raycast and type `kz` or "KoZip"
2. Enter your search (address, building name, or postal code)
3. Use keyboard shortcuts for quick actions:

### Keyboard Shortcuts

- **Enter**: Copy Korean road address with postal code
- **⌘ + C**: Copy English road address with postal code
- **⌘ + T**: Toggle between road and jibun (lot) address
- **⌘ + O**: Open in Kakao Map
- **⌘ + ⇧ + O**: Open in Naver Map

## Address Formats

### Korean
- `(12345) 서울특별시 강남구 테헤란로 123`
- `(12345) 서울특별시 강남구 역삼동 123-45`

### English
- `123 Teheran-ro, Gangnam-gu, Seoul (12345)`
- `123-45 Yeoksam-dong, Gangnam-gu, Seoul (12345)`

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md).

### Quick Start
```bash
npm install
npm run dev
```

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Commit with descriptive messages
5. Push and open a Pull Request

## License

MIT License - see [LICENSE](LICENSE).

## Credits

- **API**: [Postcodify](https://postcodify.poesis.kr/) by Poesis
- **Maps**: Kakao Map, Naver Map integration
- **Icon**: Based on [Korea Post Emblem](https://ko.m.wikipedia.org/wiki/%ED%8C%8C%EC%9D%BC:Emblem_of_Korea_Post.svg)
- **Author**: [kyungw00k](https://github.com/kyungw00k)

## Support

If you encounter issues or have suggestions:
1. Check existing [issues](https://github.com/kyungw00k/raycast-kozip-extension/issues)
2. Open a new issue with details
3. Use the enhancement label for feature requests

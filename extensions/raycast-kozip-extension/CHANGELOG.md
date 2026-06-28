# Changelog

## [1.0.0] - 2025-07-29

### Added
- Initial release of Korean Postal Code Search extension
- Search for South Korean addresses in multiple formats
- Support for both road address (도로명주소) and lot-based address (지번주소)
- Debounced search with 500ms delay to prevent excessive API calls
- Local caching system for improved performance (24-hour cache duration)
- Multiple copy options:
  - Copy Korean address with postal code
  - Copy English address with postal code
- Map integration:
  - Open in Kakao Map
  - Open in Naver Map
- Keyboard shortcuts:
  - Cmd+C: Copy English address
  - Cmd+T: Toggle between road and lot-based addresses
  - Cmd+O: Open in Kakao Map
  - Cmd+Shift+O: Open in Naver Map

### Features
- Real-time address search as you type
- Automatic Korean text normalization (NFC)
- Building name display when available
- Responsive UI with loading states

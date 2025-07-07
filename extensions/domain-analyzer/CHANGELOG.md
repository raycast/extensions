# Changelog

All notable changes to the Domain Analyzer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Initial release of Domain Analyzer extension for Raycast
- Complete domain analysis functionality including:
  - DNS record analysis (A, AAAA, MX, NS, TXT, SOA, CNAME)
  - Ping connectivity testing with detailed statistics
  - Website status checking with SSL certificate validation
  - WHOIS registration information lookup
  - IP geolocation and ISP details
  - Technology detection (CMS, frameworks, programming languages)
- User preferences for:
  - Configurable timeout settings
- Comprehensive error handling and user feedback
- Professional UI with organized information display
- Support for both domain names and IP addresses

### Technical Features
- TypeScript implementation with full type safety
- Modular API architecture
- DNS packet parsing with native Node.js modules
- HTTP/HTTPS connectivity testing
- Geolocation services integration
- Technology stack detection
- Responsive and accessible UI components

### Documentation
- Complete English documentation
- Usage examples and configuration guide
- Development setup instructions
- Feature overview and technical details

[Unreleased]: https://github.com/raycast/extensions/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/raycast/extensions/releases/tag/v1.0.0 
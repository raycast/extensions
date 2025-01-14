# Changelog

## [1.1.0] - 2024-09-13

### Improvement
- Improved loading of new headlines and improved caching

## [Initial release] - 2024-09-12

### Added

- Fetches news headlines from multiple sources:
  - English: Dutch News, NL Times, IamExpat, and The Guardian - Netherlands
  - Dutch: De Speld, De Telegraaf, De Volkskrant, Het Parool, NOS, NRC, and NU.nl
- Support for Dutch and English language news sources
- Language preference setting (Dutch/English/System)
- Filter news by source or view all headlines
- Show categories option in preferences
- Open news articles directly in the browser
- Copy article link to clipboard

### Features

- Improved date parsing for various formats
- Caching system for better performance
- Pagination for loading more news items
- Error handling and user feedback via toasts
- Favicon display for each news source

### Technical

- Refactored code for better performance and maintainability
- Implemented error handling and logging
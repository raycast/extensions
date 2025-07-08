# Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Initial release of Norwegian Business Register extension
- Search Norwegian companies by name or organization number using official Brønnøysundregistrene API
- View comprehensive company information including:
  - Organization details (number, address, industry, founding date)
  - Contact information (phone, email, website)
  - Financial data (revenue, EBITDA, operating results, balance sheet)
  - Annual accounts with auditing status
- Favorites functionality:
  - Add/remove companies to favorites
  - Quick access to favorite companies on startup
  - Persistent local storage
- Action commands:
  - Copy organization number
  - Copy company name
  - Open company website (if available)
  - Open official Brønnøysundregistrene page
- Smart search detection automatically determines if input is company name or organization number
- Professional UI with balanced two-column layout
- Support for both Norwegian and English interfaces

### Features
- Real-time search with debouncing
- Financial metrics prominently displayed
- Empty state guidance for new users
- Keyboard shortcuts for all actions
- Toast notifications for favorites management
- Loading states and error handling
- Responsive design for light and dark themes
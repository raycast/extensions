# PSE Tools Changelog

## [1.1.0] - 2024-12-19

### Added
- **Intelligent Caching System**: Sub records are now cached locally using Raycast's LocalStorage
- **Cookie Change Detection**: Automatically detects when the PHPSESSID cookie is updated
- **Manual Refresh**: Added `Cmd+R` shortcut to manually refresh the sub list
- **Cache Management**: Added `Cmd+Shift+Delete` shortcut to clear the cache
- **Fallback Support**: Uses cached data if the API is unavailable
- **Better Error Handling**: Improved error messages and user feedback
- **Cache Status Display**: Shows last updated time and subscription count

### Improved
- **User Experience**: No need to update the cookie every time the command is run
- **Performance**: Faster loading when using cached data
- **Reliability**: Better error handling and fallback mechanisms

## [1.0.0] - 2024-04-20

### Added
- Initial release with My IP and Sub Info commands
- Basic sub list functionality with QMOPS2 integration
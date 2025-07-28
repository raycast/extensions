# Laravel Toolkit Changelog

## [1.1.0] - 2025-01-28

### Added
- Open Project command with cross-platform support (macOS, Windows, Linux)
- Environment Manager for editing and switching `.env` files
- Log tailing command to stream `laravel.log` in real time
- Serve command to run `php artisan serve`
- Queue Work command to run `php artisan queue:work`
- Project discovery functionality to scan folders for Laravel projects
- Project list management with ability to remove projects
- Artisan command list viewer
- Custom Artisan command execution with validation
- Composer Install and Update commands
- Run Tests command with output display
- Clear Active Project functionality
- Project display utilities with improved UI context

### Improved
- Enhanced cross-platform support for opening projects in editors
- Better Composer command resolution and path detection
- Improved process spawning with hidden sensitive environment variables
- Enhanced project management with clear active project option
- Better error handling and user feedback across all commands
- Improved route list parsing with JSON support
- Enhanced Artisan command execution with better error handling

### Fixed
- Fixed syntax errors in discover-projects component
- Resolved ESLint no-useless-escape errors
- Fixed Prettier formatting issues across all files
- Fixed pre-commit hook syntax error
- Removed unused variables to pass linting

### Development
- Added Husky pre-commit hooks for code quality
- Updated to Node.js v22.14.0 requirement
- Added comprehensive linting and formatting rules
- Updated documentation and development guidelines
- Added Raycast store compliance improvements

## [1.0.0] - Initial Release

### Added
- Basic Laravel project management
- Core Artisan command execution
- Route listing functionality
- Cache clearing commands
- Database migration support
- Initial project setup and configuration

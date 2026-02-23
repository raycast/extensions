# Prusa Printer Control Changelog

## [Bug Fix] - 2026-02-23

- Fixed NaN appearing in time displays when printer doesn't have time estimates; time displays now show "Starting..." at the beginning of a print instead of invalid values
- Fixed double error icons when there's an error

## [Bug Fix] - 2026-01-31

Fixed error when accessing job progress while printer is idle

## [Menu Bar Progress] - 2026-01-30

Added menu bar command to display real-time print progress and time remaining

## [Initial Version] - 2025-03-03

### Added
- Live printer status monitoring
  - Temperature tracking for nozzle and bed
  - Print progress with completion percentage
  - Time remaining and elapsed time
  - Z-height, flow rate, and print speed display
  - Fan speed monitoring

- File management
  - Browse and search print files
  - Sort by name or date
  - Start prints directly
  - Delete files
  - View file details and thumbnails

- Print control actions
  - Pause/Resume prints
  - Cancel ongoing prints
  - Auto-refresh during active prints

- Error handling and recovery
  - Automatic retry for network issues
  - Clear error messages with troubleshooting steps
  - Network diagnostics
  - Loading states and progress indicators

- Configuration
  - Printer IP address setting
  - Secure API key storage
  - Configurable request timeout
  - Input validation

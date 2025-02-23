# Prusa Printer Control Changelog

## [Initial Version] - {PR_MERGE_DATE}

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

### Supported Printers
- Prusa XL (built-in PrusaLink)
- Prusa MK4 (built-in PrusaLink)
- Prusa MINI+ (built-in PrusaLink)
- Prusa MK3S+ (via Raspberry Pi running PrusaLink)
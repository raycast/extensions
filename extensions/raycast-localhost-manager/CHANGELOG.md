# Localhost Manager Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Added
- View all TCP and UDP listening ports on macOS
- Real-time process monitoring with 4-second auto-refresh
- Display process names, PIDs, users, and resource usage (CPU & Memory)
- Two view modes:
  - Simple View: Quick overview with essential information
  - Advanced View: Detailed metadata panel with comprehensive process information
- Filtering options:
  - Show/hide system processes
  - Show/hide 0% CPU usage badges
  - Combined filtering options
- Docker container integration:
  - List running containers
  - Display port mappings
  - Show CPU and memory usage
  - Container management actions (start, stop, restart)
- Process management actions:
  - Open localhost URL in browser
  - Copy host:port, PID, or command to clipboard
  - Gracefully terminate processes (SIGTERM)
  - Force kill processes (SIGKILL)
  - Kill all processes by port
- Reveal executable in Finder
- Open process working directory
- User preferences for default view mode
- Intelligent process name resolution (converts abbreviated names to full application names)
- Support for common macOS applications like Spotify, Chrome, Teams, etc.
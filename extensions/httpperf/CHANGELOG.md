# Changelog

All notable changes to the HTTP Performance Analyzer extension will be documented in this file.

## [1.0.0] - 2025-11-13

### Added

- Initial release of HTTP Performance Analyzer
- Real-time HTTP/HTTPS performance metrics analysis
- Detailed timing breakdown for each request phase:
  - DNS Lookup time
  - TCP Connection time
  - TLS Handshake time (for HTTPS)
  - Server Processing time
  - Content Transfer time
  - Total request time
- Performance grading system (A+ to F)
- Visual status indicators for each phase (✅ ⚠️ 🔴)
- Automatic performance threshold evaluation
- Support for multiple HTTP methods (GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS)
- Custom HTTP headers support
- Redirect following option
- Clean List-based UI with icons and color-coded statuses
- Keyboard shortcuts:
  - Cmd+C: Copy results
  - Cmd+U: Copy URL
  - Cmd+D: View detailed report
- Connection information display (IP, HTTP version, status code)
- Download metrics (size and speed)

### Technical

- Built with TypeScript and React
- Uses curl for performance measurement
- Comprehensive error handling
- Cross-platform compatible (macOS)

---

## Release Notes

This is the first stable release of HTTP Performance Analyzer for Raycast. The extension provides a quick and easy way to analyze HTTP request performance directly from your Raycast launcher.

### Key Features

- **Visual Performance Metrics**: See at a glance which phases of your HTTP request are slow
- **Smart Indicators**: Color-coded status (green/orange/red) based on performance thresholds
- **Performance Grades**: Automatic A+ to F grading for quick assessment
- **Detailed Analysis**: View comprehensive metrics for every request phase
- **Developer-Friendly**: Perfect for debugging performance issues and API monitoring

### Use Cases

- Debug slow API responses
- Monitor website performance
- Troubleshoot network issues
- Benchmark different endpoints
- Validate CDN and caching effectiveness

# HTTP Performance Analyzer ⚡

A Raycast extension to analyze and visualize HTTP/HTTPS request performance metrics.

## Features

- 🌐 **DNS Lookup Time** - Measure domain name resolution
- 🔗 **TCP Connection Time** - Track TCP handshake duration
- 🔒 **TLS Handshake Time** - Monitor SSL/TLS negotiation (HTTPS only)
- ⚙️ **Server Processing Time** - Measure time to first byte
- 📥 **Content Transfer Time** - Track download duration
- ⏱️ **Total Request Time** - Complete end-to-end timing
- 📊 **Performance Grades** - Automatic A+ to F rating
- ⚠️ **Status Indicators** - Visual indicators for each phase (✅ ⚠️ 🔴)

## Installation

### From Raycast Store

1. Open Raycast
2. Search for "HTTP Performance Analyzer"
3. Click "Install"

### Manual Installation (Development)

```bash
# Clone and setup
git clone <repository-url>
cd httpperf
npm install

# Start development mode
npm run dev
```

## Usage

1. Open Raycast
2. Type "Analyze HTTP Performance"
3. Enter the URL you want to test
4. View the performance metrics

### Keyboard Shortcuts

- **Cmd+C** - Copy results
- **Cmd+U** - Copy URL
- **Cmd+D** - View detailed report

### Advanced Options

- **HTTP Method**: GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS
- **Custom Headers**: Add custom HTTP headers
- **Follow Redirects**: Enable/disable redirect following

## Display

The extension shows:

**Top Section:**
- Connection info (IP, HTTP version, status code, performance grade)
- Downloaded size and speed

**Timing Breakdown:**
- Each phase with duration and percentage
- Color-coded status indicators:
  - ✅ Green = Excellent performance
  - ⚠️ Orange = Could be improved  
  - 🔴 Red = Needs optimization

**Example:**
```
⚡ 756ms

🔗 Connection               ✅ 200 Success · HTTP/2 · ⚡ A
   142.250.185.196

💾 Downloaded               4.02 KB at 5.31 KB/s

🌐 DNS Lookup              150ms      18.5%  ✅
🔗 TCP Connection          119ms      14.1%  ✅
🔒 TLS Handshake           356ms      47.0%  🔴
⚙️  Server Processing      131ms      17.3%  ✅
📥 Content Transfer          0ms       0.0%  ✅
🕐 Total Time              756ms
```

## Performance Thresholds

Each phase is evaluated against standard thresholds:

- **DNS**: < 50ms ✅ | 50-150ms ⚠️ | >150ms 🔴
- **TCP**: < 100ms ✅ | 100-200ms ⚠️ | >200ms 🔴
- **TLS**: < 200ms ✅ | 200-400ms ⚠️ | >400ms 🔴
- **Server**: < 500ms ✅ | 500-1500ms ⚠️ | >1500ms 🔴
- **Transfer**: < 200ms ✅ | 200-600ms ⚠️ | >600ms 🔴

## Requirements

- Raycast (latest version recommended)
- macOS 11.0 or later
- `curl` command (pre-installed on macOS)

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Troubleshooting

### "Failed to analyze" error

- Verify the URL is valid and accessible
- Check your internet connection
- Some websites may block automated requests
- Try with a different URL

### No TLS metrics

- TLS metrics only appear for HTTPS URLs
- HTTP requests will show 0ms for TLS

### Unexpected timing

- Network conditions affect results
- Server location and load impact timing
- Run multiple tests for consistency

## Contributing

Contributions welcome! Please submit a Pull Request.

## License

MIT License

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

# Domain Analyzer - Raycast Extension

Complete domain analysis with DNS information, ping, status, whois, geolocation and detected technologies.

## Features

### 🌐 Complete DNS Analysis
- A (IPv4) and AAAA (IPv6) records
- MX records for email
- Name servers (NS)
- TXT and SOA records
- Parent domain detection
- CNAME records

### 🏓 Connectivity Analysis
- Ping with detailed statistics (min/avg/max)
- Packet loss detection
- Domain online/offline status

### 🌐 Website Status
- HTTP/HTTPS verification
- Response status codes
- Response time
- SSL certificate validation

### 📄 Whois Information
- Domain registrar
- Creation, update and expiration dates
- Name servers
- Domain status

### 🌍 Geographic Information
- Server IP address
- Geographic location (country, region, city)
- ISP and organization information
- Autonomous system (AS)

### 💻 Technology Detection
- Web server used
- CMS detected (WordPress, Drupal, etc.)
- JavaScript frameworks (React, Vue, Angular)
- CSS libraries (Bootstrap, etc.)
- Programming languages (PHP, ASP.NET, etc.)

## Usage

1. Open Raycast
2. Type "Analyze Domain" or use the direct command
3. Enter the domain you want to analyze (e.g. `example.com`)
4. Navigate through the different analysis sections:
   - DNS information
   - Domain ping
   - Website status
   - Whois information
   - Geographic/IP data
   - Detected technologies

## Configuration

### Available Preferences

- **Timeout**: Time limit in seconds for queries (default: 10s)

## Dependencies

- `@raycast/api` - Raycast API
- `@raycast/utils` - Raycast utilities
- `node-fetch` - For HTTP requests
- `dns-packet` - For advanced DNS queries

## Required System Tools

The extension uses the following system tools (included in macOS by default):
- `dig` - For DNS queries
- `ping` - For connectivity tests
- `whois` - For registration information
- `openssl` - For SSL verification

These tools are available by default on macOS.

## Limitations

- Some domains may block automated queries
- Whois information may be limited depending on domain extension
- Queries are subject to the configured timeout

## Development

### Available Scripts

- `npm run dev` - Local development
- `npm run build` - Production build
- `npm run lint` - Code verification
- `npm run fix-lint` - Automatic lint fixes

## Contributions

Contributions are welcome. Please:

1. Fork the project
2. Create a branch for your feature
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT - See LICENSE file for more details.

## Support

If you encounter any problems or have suggestions, please create an issue in the repository. 
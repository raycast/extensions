# Gandi Extension for Raycast

Manage your Gandi domains, DNS records, and check domain availability directly from Raycast.

## Features

### Core Domain Management
- **List Domains**: View all your domains with expiration dates, auto-renewal status, and domain lock status
- **Domain Details**: Get comprehensive information about any domain including important dates, DNS configuration, and services
- **Check Domain Availability**: Search for available domain names with pricing information
- **Auto-renewal Management**: Toggle automatic domain renewal on/off

### DNS & Technical Management
- **DNS Management**: View, add, edit, and delete DNS records for your domains
- **Nameserver Management**: View and update domain nameserver configurations
- **Domain Lock/Unlock**: Control transfer lock status for domain security

### Transfer & Security
- **Authorization Code Reset**: Reset domain authorization codes for transfers
- **Domain Transfer Operations**: Initiate and track domain transfers to Gandi
- **Transfer Status Tracking**: Monitor ongoing domain transfer processes

### Advanced Features
- **Domain Contacts Management**: View and update domain contact information
- **Domain Tags Management**: Organize domains with custom tags
- **Domain Renewal Information**: Check renewal pricing and options
- **TLD Information**: Browse available top-level domains and their details
- **Trademark Claims**: Check for potential trademark conflicts

## Setup

1. Install the extension from the Raycast Store
2. Get your Gandi Personal Access Token:
   - Go to [Gandi Admin](https://admin.gandi.net)
   - Navigate to Account & Organization → Security
   - Generate a new Personal Access Token with appropriate permissions
3. Open Raycast preferences for the Gandi extension
4. Enter your Personal Access Token

## Commands

### List Domains
- View all domains in your Gandi account
- See expiration dates with color-coded status (red = expires soon, orange = expires within 90 days, green = good)
- Toggle auto-renewal on/off
- Quick access to domain details and Gandi dashboard

### Check Domain Availability
- Search for domain availability
- View pricing for different registration periods
- Direct link to register available domains

### Manage DNS Records
- Select a domain to view its DNS records
- Add new DNS records (A, AAAA, CNAME, MX, TXT, NS, CAA, SRV)
- Edit existing DNS records
- Delete DNS records with confirmation
- View TTL and record values

## Preferences

- **API Token**: Your Gandi Personal Access Token (required)

## API Permissions

Your Personal Access Token should have the following permissions:
- Domain: Read/Write access to view and manage domains
- DNS: Read/Write access to manage DNS records
- Certificate: Read access (optional, for future features)

## Support

For issues related to the extension, please report them on the [Raycast Extensions repository](https://github.com/raycast/extensions).

For Gandi API issues, refer to the [Gandi API documentation](https://api.gandi.net/docs/).

## License

MIT License
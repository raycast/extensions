# Cloudflare

This extension allows to view your Cloudflare sites, pages, domains, and more. It also supports purging the cache of your sites.

## Configuration

To use the extension, you'll need to provide an **API token**. You can read more about creating and using API tokens in [Cloudflare docs](https://api.cloudflare.com/#getting-started-requests). You can get an [API token with the appropriate permissions here](https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22cache%22%2C%22type%22%3A%22purge%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22memberships%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22page%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22zone_settings%22%2C%22type%22%3A%22read%22%7D%5D&name=Raycast).

The following permissions are required to use the full functionality of the extension:

- Account
  - Account Settings: Read
  - Cloudflare Pages: Read
- User
  - Memberships: Read
- Zone
  - Zone Settings: Read
  - Zone: Read
  - DNS: Read
  - Cache Purge: Purge

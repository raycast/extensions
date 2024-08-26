# cPanel Changelog

## [View Databases + Create Limited DNS Records] - 2024-08-26

- View MySQL or PostgreSQL Databases
- In Domain DNS Zone, you can create `A`, `AAAA`, `CNAME`, `TXT` records
- **refactor**: removed the cPanel URL check from hook to top of components - this makes the hook less complex and allows us to call functions like "revalidate" directly rather than "() => revaidate?.()"

## [Initial Version] - 2024-08-01

- View Domains and their DNS Zones
- View Email Accounts and their Disk Usage
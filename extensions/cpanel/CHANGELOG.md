# cPanel Changelog

## [View FTP Accounts + Copy File Contents] - 2025-02-17

- Copy file contents after viewing in `Files`
- View FTP Accounts in `FTP Accounts`
- Create FTP Account in `FTP Accounts`

## [Enhancements: Files & DB + New Account Command] - 2024-10-21

- Show or Hide "MIME Type" in `Files` via Preferences
- View "File Content" for small files in `Files`
- View "Database Schema" in `Databases`
- View "Account Statistics and Usage" in `Accounts`
- Change "cPanel Account Password" in `Accounts`

## [Enhancements] - 2024-09-11

- Create Email Account
- Filter DNS Zone (records) by (record) type
- View Files and Directories

## [View Databases + Create Limited DNS Records] - 2024-08-26

- View MySQL or PostgreSQL Databases
- In Domain DNS Zone, you can create `A`, `AAAA`, `CNAME`, `TXT` records
- **refactor**: removed the cPanel URL check from hook to top of components - this makes the hook less complex and allows us to call functions like "revalidate" directly rather than "() => revaidate?.()"

## [Initial Version] - 2024-08-01

- View Domains and their DNS Zones
- View Email Accounts and their Disk Usage
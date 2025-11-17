<p align="center">
    <img src="./assets/cpanel.png" width="200" height="200" />
</p>

# cPanel Raycast Extension

This is a Raycast extension for [cPanel](https://cpanel.net/) `User` level accounts (Admin and Reseller not supported). With this extension you can View Domains and their DNS Zones, Email Accounts and their Disk Usage.

## 🚀 Getting Started

1. **Install extension**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/cpanel) OR via Raycast Store

2. **Enter your cPanel Details**: The first time you use the extension, you'll need to enter the following in Preferences OR at first prompt:

    a. The URL of your cPanel instance (w/ Port)

    b. cPanel Username

    c. cPanel API Token

    - `Sign In` to your cPanel instance
    - `Navigate` to "Manage API Tokens" (if you do not see it, your provider may have disabled API access and you wil have to ask them to enable it)
    - `Create` and `Enter` desired Token Name (for expiration, select "The API Token will not expire" unless you are comfortable rotating keys)

## 🗒️ Notes

- This extension is for **User** level accounts so `Reseller` and `Admin` accounts as well as `WHM` accounts are not guaranteed to work.

## 🔧 Commands

<details>
<summary>This extension provides the following commands:</summary>

- Domains
    - View DNS Zone
        - Create DNS Zone Record
        - Delete DNS Zone Record
- Email Accounts
    - View Disk Information
    - Create Email Account
- Databases
    - View Schema
- Files
    - View File
- Account
    - Update Password
- FTP Accounts
    - Create FTP Account
- API Tokens
    - Revoke API Token
    
</details>

## ○ Endpoints

<details>
<summary>Inluded cPanel Operations (Modules and Functions)</summary>

| module | function | extension command | comments |
|--------|----------|-------------------|----------|
| DomainInfo | list_domains | Domains |
| DNS | mass_edit_zone | Domains > View DNS Zone > Create DNS Record | `add` limited records + `del` |
| DNS | parse_zone | Domains > View DNS Zone |
| Email | add_pop | Email Accounts > Create Email Account |
| Email | list_pops | Email Accounts |
| Email | list_pops_with_disk | Email Accounts > View Disk Information |
| Ftp | list_ftp_with_disk | FTP Accounts |
| Ftp | add_ftp | FTP Accounts > Create FTP Account |
| Fileman | get_file_content | Files > View File |
| Fileman | list_files | Files |
| Mysql | dump_database_schema | Databases > View Schema |
| Mysql | list_databases | Databases |
| Postgresql | dump_database_schema | Databases > View Schema |
| Postgresql | list_databases | Databases |
| ResourceUsage | get_usages | Account |
| Tokens | list | API Tokens |
| Tokens | revoke | API Tokens |
| UserManager | change_password | Account > Update Password |
| Variables | get_user_information | Account |

</details>
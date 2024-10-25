# <img src="./assets/cyberpanel.png" width="20" height="20" /> CyberPanel Raycast Extension

This is a Raycast extension for [CyberPanel](https://cyberpanel.net/). With this extension you can manage Users, Packages, Websites, Child Domains, Backups, Databases, Email Accounts, DNS Records and FTP Accounts in CyberPanel using CyberPanel Cloud API ([documentation link](https://documenter.getpostman.com/view/2s8Yt1s9Pf?version=latest)).

## 🚀 Getting Started

1. **Install extension**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/cyberpanel) OR `install` via Raycast Store

2. **Enable API Access**: You need to enable API Access in your instance (reference: https://cyberpanel.net/KnowledgeBase/home/cyberpanel-api-access-2/):

    a. `Log In` to your CyberPanel instance

    b. `Navigate` to https://[DOMIAN]:[PORT]/users/apiAccess

    c. `Select` user, `Enable` access and `Save`

3. **Enter your Panel Details**: The first time you use the extension, you'll need to enter the following in Preferences OR at first prompt:

    a. The URL of your CyberPanel installation (w/ Port)

    b. Admin Username

    c. Admin Password

    d. Token Type - The current build of CyberPanel has changed the way the API Token is saved. IF you are sure your credentials are valid yet you are getting an _Invalid credentials_ error, change the Token Type to "SHA-256".

## 🗒️ Note

Extension has been tested to work with the following versions:
1. `CyberPanel Version 2.3 Build 4` (uses Base64 Token)
1. `CyberPanel Version 2.3 Build 7` (uses SHA-256 Token)

## 🔧 Commands

This extension provides the following commands:

- Verify Login
- List Users
    - Create User
    - Delete User
    - Modify User
    - Change User ACL
    - List Child Domains
        - Create Child Domain
        - Change Child Domain PHP Version
        - Delete Child Domain
- List Packages
    - Create Package
    - Delete Package
    - Modify Package
- List Websites
    - Create Website
    - Change Website PHP Version
    - Change Website Linux User Password
    - Delete Website
- Create Backup
- List Databases in Domain
    - Create Database
    - Delete Database
- List Email Accounts in Domain
    - Create Email Account
    - Delete Email Account
- List DNS Records in Domain
    - Create DNS Record
    - Delete DNS Record
- List FTP Accounts in Domain
    - Create FTP Account
    - Delete FTP Account
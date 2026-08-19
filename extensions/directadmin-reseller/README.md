<p align="center">
    <img src="./assets/directadmin-reseller@dark.png" width="200" height="200" />
</p>

# DirectAdmin [Reseller] Raycast Extension

This is a Raycast extension for [DirectAdmin](https://www.directadmin.com/) Reseller level accounts. With this extension you can manage Reseller User Accounts, User Domains and Subdomains, User Email Accounts, User Status (Suspend or Unsuspend), and manage your own user databases, domains and subdomains.

## 🚀 Getting Started

1. **Install extension**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/directadmin-reseller) OR via Raycast Store

2. **Enter your DirectAdmin Details**: The first time you use the extension, you'll need to enter the following in Preferences OR at first prompt:

    a. The URL of your DirectAdmin instance (w/ Port)

    b. Reseller Username

    c. Reseller Password

## 🗒️ Notes

- This extension is for ****Reseller**** level accounts but you can also manage your own "user" level account (i.e. a ****User****) through the `My Domains` and `My Databases` commands - the other commands will not work as you need to be a **Reseller**.

- On a Technical Note, some "user" commands have dedicated DirectAdmin endpoints but for those which do not, a **Reseller** can `impersonate` a user through the API.

## 🧪 Manage Panels (Experimental)

There is a new command (disabled by default) that allows you to manage multiple panels using the extension. `Enable` if interested. `WIP`

## 🔧 Commands

This extension provides the following commands:

- Reseller User Accounts
    - See User Usage
    - See User Config
        - Modify User
    - Change User Account Email
    - Change User Ticketing Email
    - See User Domains
        - Get Subdomains
            - Create Subdomain
            - Delete Subdomain
        - Get Email Accounts
            - Change Password
            - Delete Email Account
            - Create Email Account
        - Create Domain
    - See User Databases
        - Create Database
        - Delete Database
    - Suspend User
    - Unsuspend User
    - Create User
    - Delete User
- Reseller User Packages
    - Get Detailed Information
- Reseller IPs
    - Get Detailed Information
- My Databases
    - Create Database
    - Delete Database
- My Domains
    - Get Subdomains
        - Create Subdomain
        - Delete Subdomain
    - Get Email Accounts
        - Change Password
        - Delete Email Account
        - Create Email Account
    - Create Domain
    
## ○ Endpoints

<details>
<summary>DirectAdmin Endpoints NOT included (these need an Admin account)</summary>

* CMD_API_ACCOUNT_ADMIN
* CMD_API_ACCOUNT_RESELLER
* CMD_API_SHOW_RESELLERS
* CMD_API_SHOW_ADMINS
* CMD_API_SHOW_ALL_USERS
* CMD_API_ADMIN_STATS
* CMD_API_PACKAGES_RESELLER

</details>

<details>
<summary>DirectAdmin Endpoints included</summary>

* CMD_API_ACCOUNT_USER
* CMD_API_SELECT_USERS
* CMD_API_SHOW_USERS
* CMD_API_CHANGE_INFO
* CMD_API_TICKET
* CMD_API_MODIFY_USER
* CMD_API_SHOW_USER_USAGE
* CMD_API_SHOW_USER_CONFIG
* CMD_API_SHOW_USER_DOMAINS
* CMD_API_PACKAGES_USER
* CMD_API_GET_SESSION
* CMD_API_SHOW_DOMAINS
* CMD_API_DOMAIN
* CMD_API_SUBDOMAINS
* CMD_API_DATABASES
* CMD_CHANGE_EMAIL_PASSWORD
* CMD_API_POP

</details>

<details>
<summary>DirectAdmin Endpoints planned to include</summary>

* CMD_API_ACCOUNT_USER - create a new user account without the need for a user package (as of `Initial Version`, a package must be specified)

</details>

---

### 👀 Looking for a different panel? Try these:

<a title="Install cpanel Raycast Extension" href="https://www.raycast.com/xmok/cpanel"><img src="https://www.raycast.com/xmok/cpanel/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install hestiacp-admin Raycast Extension" href="https://www.raycast.com/xmok/hestiacp-admin"><img src="https://www.raycast.com/xmok/hestiacp-admin/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
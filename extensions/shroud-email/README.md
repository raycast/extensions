# <img src="./assets/shroud-email.png" width="20" height="20" /> Shroud.email Raycast Extension

This is a Raycast extension for [Shroud.email](https://shroud.email/). With this extension, you can View Domains and Create or View Aliases in your Shroud.email instance.

## 🚀 Getting Started

1. **Install extensions**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/shroud-email)

2. **Enter your Shroud.email domain**: The first time you use the extension, you'll need to enter your Shroud.email domain; If you are self-hosting, enter the URL of your Shroud.email instance OR leave unchanged to use the default (https://app.shroud.email)

3. **Get your API Token**: To use most commands you will need to enter your API Token after generating it through the extension:

    a. `Run` **Create API Token** command through the Shroud.email extension (this command only requires your valid Shroud.email domain)

    b. Enter `Username`, `Password` and if **2FA** is enabled, `TOTP` of your account

    b. If successful, press `Enter` to `copy` and `navigate` to **Extension Preferences**
    
    c. Enter `API Token` in Preferences

## 🗒️ Notes
* The `Domains` command will only fetch domains that have **valid** DNS records.
* When **Creating** `Alias`, you can only create alias for custom domain if the domain is able to be fetched i.e. domains that have **valid** DNS records.


## 🔧 Commands

This extension provides the following commands:

- Create API Token
- Aliases
    - View Aliases
    - Create Alias
- Domains
    - View Domains

## 🛠️ Installation

To install this extension from the source code, follow these steps:

1.  Clone this repository.
2.  Run `npm install` to install the dependencies.
3.  Run `npm run build` to build the extension.
4.  Run `npm run publish` to publish the extension to Raycast store.
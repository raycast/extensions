# <img src="./assets/mailwip.png" width="20" height="20" /> Mailwip Raycast Extension

This is a Raycast extension for [Mailwip](https://mailwip.com/) (previously known as **Hanami**). With this extension, you can Batch Delete Domains, Manage Aliases, and View MailLog in Mailwip.

## 🚀 Getting Started

1. **Install extensions**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/mailwip)

2. **Get your API Key**: The first time you use the extension, you'll need to enter your Mailwip API key:

    a. `Sign in to your Mailwip Dashboard` at [this link](https://app.mailwip.com/users/sign_in) OR `Create an account` at [this link](https://app.mailwip.com/users/sign_up)

    b. `Navigate` to [API Access](https://app.mailwip.com/api_keys)

    c. `Generate API Key` then `Copy API Key`
    <img src="./assets/mailwip-generate-api-key.png" alt="Generate API Key" />

    d. Enter `API Key` in Preferences OR at first prompt

3. **Add Domains**: You will need to add each domain:

    a. `Navigate` to [+ Add domain](https://app.mailwip.com/domains/new)

    b. `Add` the domain
    <img src="./assets/mailwip-add-domain.png" alt="Add Domain" />

    c. `Add DNS Records` in your domain's DNS and check records through Mailwip

    d. Enter `domain(s)` in Preferences OR at first prompt

4. (OPTIONAL) **Enable Maillog**: To log emails you need to enable Maillog:

    a. `Navigate` to **Configure** in domain i.e. https://app.mailwip.com/domains/[DOMAIN_HERE]/edit

    b. `Select` your desired log level and `Save`
    <img src="./assets/mailwip-enable-maillog.png" />

## 🔧 Commands

This extension provides the following commands:

- Aliases
    - View Aliases
    - Create Alias
    - Delete Alias
- Batch Delete Domains
- Emails
    - View Emails in Maillog

## 🛠️ Installation

To install this extension from the source code, follow these steps:

1.  Clone this repository.
2.  Run `npm install` to install the dependencies.
3.  Run `npm run build` to build the extension.
4.  Run `npm run publish` to publish the extension to Raycast store.
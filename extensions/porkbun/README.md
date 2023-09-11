# <img src="./assets/porkbun.png" width="20" height="20" /> Porkbun Raycast Extension

This is a Raycast extension for [Porkbun](https://porkbun.com/). With this extension, you can fetch latest domain pricing and create, list, edit or delete DNS records for API-enabled domains in your account.

## 🚀 Getting Started

1. **Install extensions**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/porkbun)

2. **Get your API Key and API Secret Key**: The first time you use the extension, you'll need to enter your Porkbun API keys:

    a. `Sign in to your Porkbun Account` at this [link](https://porkbun.com/account/login)

    b. `Navigate` to [API page](https://porkbun.com/account/api)
    
    c. `Enter` 'API Key Title', click `Create API Key` and `copy` the 2 keys
    <img src="./assets/porkbun-create-api-key.png" alt="Create API Key" />
  
    d. Enter `API Key` and `API Secret Key` in Preferences OR at first prompt

3. **Enable API access**: You will need to enable API access for each domain:

    a. `Navigate` to [Domain Management](https://porkbun.com/account/domainsSpeedy)

    b. `Toggle` the "Details tab" then toggle `API Access` for each domain
    <img src="./assets/porkbun-enable-api-access.png" alt="Enable API Access" />

## 🔧 Commands

This extension provides the following commands:

- Create DNS Record
- Delete DNS Record
- Domain Pricing
- Edit DNS Record
- Ping
- Retrieve DNS Record
- Retrieve SSL Bundle

## 🛠️ Installation

To install this extension from the source code, follow these steps:

1.  Clone this repository.
2.  Run `npm install` to install the dependencies.
3.  Run `npm run build` to build the extension.
4.  Run `npm run publish` to publish the extension to Raycast store.
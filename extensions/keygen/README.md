<p align="center">
    <img src="./assets/logo.png" />
</p>

# Keygen

This is a Raycast extension for [Keygen](https://keygen.sh/) - _Open, enterprise-grade licensing & distribution_. With this extension you can:

- View **API Tokens**
    - Revoke Token
- View **API Usage**
- View **Licenses**
    - Create License
- View **Policies**
    - Create Policy
- View **Products**
    - Create Product
- View **Users**
    - Create User
    - Delete User

## 🚀 Getting Started

1. **Install extension**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/keygen) OR `install` via Raycast Store

    <a title="Install keygen Raycast Extension" href="https://www.raycast.com/xmok/keygen"><img src="https://www.raycast.com/xmok/keygen/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>

2. **Get your Keygen Account ID**:

    - `Navigate` to [Settings](https://app.keygen.sh/settings)
    - `Copy` and `Paste` the ID in Preferences.

3. **Get your Keygen Admin Token**:

    Keygen has different token types:
        
    - For best results: use an **Admin** Token (`admin-xxxx...xxxx`),
    - If you are concerned about security, use an **Environment** Token (`env-xxxx...xxxx`),
    - If you only want to view your _Licenses_, you can use a **Product** Token (`prod-xxxx...xxxx`)

    To generate an **Admin** Token, `refer` to [API Tokens - API Reference - Documentation - Keygen](https://keygen.sh/docs/api/tokens/#tokens-generate) and `make` a request similar to the one below

    ```bash
    curl -X POST https://api.keygen.sh/v1/accounts/<account>/tokens \
        -H 'Accept: application/vnd.api+json' \
        -u "<email>:<password>"
    ```

    `Copy` and `Paste` the token in Preferences.

## 🗺️ Roadmap

Keygen has a lot to offer and there will be commands and "AI Tools" to deal with more entities such as:

- Entitlements
- Groups
- Machines
- Components
- Processes
- Users (WIP)

... and more.

## ➕ More

Looking for more cool OSS? Try the following extensions:

<a title="Install appwrite Raycast Extension" href="https://www.raycast.com/xmok/appwrite"><img src="https://www.raycast.com/xmok/appwrite/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install coolify Raycast Extension" href="https://www.raycast.com/xmok/coolify"><img src="https://www.raycast.com/xmok/coolify/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install dokploy Raycast Extension" href="https://www.raycast.com/xmok/dokploy"><img src="https://www.raycast.com/xmok/dokploy/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install neon Raycast Extension" href="https://www.raycast.com/xmok/neon"><img src="https://www.raycast.com/xmok/neon/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install resend Raycast Extension" href="https://www.raycast.com/xmok/resend"><img src="https://www.raycast.com/xmok/resend/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
<a title="Install unkey Raycast Extension" href="https://www.raycast.com/xmok/unkey"><img src="https://www.raycast.com/xmok/unkey/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;"></a>
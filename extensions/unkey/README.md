<p align="center">
    <img src="./assets/unkey.png" width="150" height="150" />
</p>

# Unkey

This is a Raycast extension for [Unkey](https://unkey.com/) - _The Developer Platform for Modern APIs_. With this extension, for each added API you can **Create**, **Verify**, **Update** and **Revoke** Keys through Unkey.

> NOTE: The extension now uses v2 of the API. If you were previously using a Root Key you may need to update its permissions

## 🚀 Getting Started

1. **Install extension**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/unkey)

2. **Get your  Root API Key**: The first time you use the extension, you'll need to enter your Unkey Root API key:

    a. `Sign in` to your Unkey Dashboard at [this link](https://app.unkey.com/auth/sign-in) OR `Create` an account at [this link](https://app.unkey.com/auth/sign-up)

    b. `Navigate` to **Root Keys** in "Settings"

    c. `Click` "+ New root key"
    
    d. `Enter` name of your choice (e.g. Raycast Extension)
    
    e. `Select` appropriate permissions (easiest is _Workspace - All workspace permissions_)
    
    f. `Click` "Create root key"
    
    g. `Copy` the key

    h. `Enter` "API Key" in Preferences OR at first prompt

3. **`Create` and `Add` API(s):**: You will have to manually enter APIs you want to use:

    - `Navigate` to **APIs** at [this link](https://app.unkey.com/apis)
    - `Click` "+ Create new API" then `Copy` its **ID**
    - `Run` **Dashboard** command in the extension and `Add` the API
    - `Repeat` for every API

## 🗒️ NOTES

- Currently, the extension fetches only 100 API Keys for any one api due to pagination of Unkey API having a limit of 100. If there are more than 100 api keys in your API you will have to either delete some keys or wait until pagination is incorporated using future Unkey API features.

## 🔧 Commands

This extension provides the following commands:

- Dashboard
    - List APIs
        - List Keys
            - Create Key
            - Delete Key
            - Update Key
- Verify Key
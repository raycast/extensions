# <img src="./assets/unkey.png" width="20" height="20" /> Unkey Raycast Extension

This is a Raycast extension for [Unkey](https://unkey.dev/). With this extension, for each added API you can Create, Verify, Update and Revoke Keys through Unkey.

## 🚀 Getting Started

1. **Install extensions**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/unkey)

2. **Get your  Root API Key**: The first time you use the extension, you'll need to enter your Unkey Root API key:

    a. `Sign in to your Unkey Dashboard` at [this link](https://unkey.dev/auth/sign-in) OR `Create an account` at [this link](https://unkey.dev/auth/sign-up)

    b. `Navigate` to **Keys** in [Settings](https://unkey.dev/app/keys)

    c. `Create New Key` then `Copy`

    d. Enter `API Key` in Preferences OR at first prompt

    e. `Create` and `Add` API(s):
        
    - `Navigate` to **APIs** at [this link](https://unkey.dev/app/apis)
    - `Create New API` then `Copy` its **ID**
    - `Run` **Dashboard** command in the extension and `Add` the API
    - `Repeat` for every API

## 🗒️ NOTES (as of *Initial Version*)

- Currently, the extension fetches only 100 API Keys for any one api due to pagination of Unkey API having a limit of 100. If there are more than 100 api keys in your API you will have to either delete some keys or wait until pagination is incorporated using future Unkey API features.

- Currently, when you `Update` a key, some of its values are returned as ```null``` but the values are updated - the Unkey endpoint responsible for returning values has a bug.


## 🔧 Commands

This extension provides the following commands:

- Dashboard
    - List APIs
        - List Keys
            - Create Key
            - Revoke Key
            - Update Key
- Verify Key
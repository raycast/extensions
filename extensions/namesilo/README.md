<p align="center">
    <img src="./assets/namesilo.png" width="200" height="200" />
</p>

# NameSilo

This is a Raycast extension for [NameSilo](https://www.namesilo.com/). With this extension, you can fetch latest domain pricing and view Auctions, Domains, Orders, Account Balance. You can also run a Whois Check for a domain.

## 🚀 Getting Started

1. **Install extension**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/namesilo) OR via Raycast Store

2. **Get your API Key**: The first time you use the extension, you'll need to enter your 'NameSilo' API Key:

    a. `Sign in to your Account` at [this link](https://www.namesilo.com/login)

    (if you don't have an account, `Sign up` at [this link](https://www.namesilo.com/sign-up))

    b. `Navigate` to `API Manager`

    c. `Generate` an API Key
    
    (OPTIONAL: `check` "Generate key for read-only access")

    d. `Copy` the "API Key"

    c. `Enter this key` in Preferences OR at first prompt

3. **(OPTIONAL) Get your OTE API Key**: You can choose to use OTE/Sandbox environment by checking it in `Preferences` which requires a separate API Key:

    a. `Contact` the NameSilo team (https://www.namesilo.com/contact-us)

    b. Once approved, you will get an OTE API Key which you can plug into `ote_api_key` in Preferences

## 🗒️ NOTES

- Using `namesilo.com` as a query/parameter will almost always show an error e.g. running a `whois` for "namesilo.com" will error out. This is an issue with the API.
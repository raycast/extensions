<div align="center">
  <img src="assets/bitwarden-512.png" width="128" height="128" />

  <br/>

  # Bitwarden Vault

  Access your Bitwarden vault directly from Raycast

  🔎 &nbsp; Search your vault &nbsp; 📋 &nbsp; Copy and paste any field &nbsp; 🔑 &nbsp; Generate passwords and TOTP codes &nbsp; ⭐ &nbsp; Mark items as favorites
</div>

<br/>

## Setup

Before you're able to use this extension, you need to complete the following steps:

#### Step 0 (arm64 only) - Install the Bitwarden CLI
> ⚠️ If you have an Intel-based Mac (`x64` architecture), you can skip this step and the CLI will be downloaded for you. You only need to complete this if you're using a arm-based Mac, meaning you have an Apple M1/2/3 Pro/Max/Ultra chip. You can check this by going to the top left ` Apple menu > About This Mac` or by executing `uname -m` in the terminal and checking for `arm64`.
>
> We are working on removing this step and doing it for you 🙂
>
> ##### **Option 1** (Preferred) - Using <u>Homebrew</u>
> ```sh
> brew install bitwarden-cli
> ```
> ##### Option 2 - Using <u>npm</u>
> ```sh
> npm install -g @bitwarden/cli
> 
> which bw # add the result to the Bitwarden CLI Path option in the extension settings¹
> ```
> ¹ [How to access the extension settings](https://manual.raycast.com/preferences): Go to Actions (`⌘` `K`) → Configure Extension
>
> For more information, please refer to the [official help center](https://bitwarden.com/help/cli/#download-and-install).

#### Step 1 - Set your account's API secrets
> 1.1 - Get the secrets from your account [security settings](https://vault.bitwarden.com/#/settings/security/security-keys) (`View API Key` button). For more information check the official [documentation](https://bitwarden.com/help/personal-api-key/#get-your-personal-api-key)
> 
> <img src="assets/setup-secrets-1.png" width="700" />

> 1.2 - Paste the secrets in the corresponding fields the **first time you use** the extension or in the **extension settings**.
> 
> <img src="assets/setup-secrets-2.png" width="700" />
> <img src="assets/setup-secrets-3.png" width="700" />

You're all set! 🎉

### Self-hosted Instance

This extension connects to Bitwarden-hosted servers by default, but can be configured to use a self-hosted Bitwarden instance instead. If the self-hosted Bitwarden server requires a self-signed TLS certificate, add the path to the extension settings.

## Security

The extension relies on the Bitwarden CLI, so every security consideration that applies to the CLI applies to the extension as well. See <https://bitwarden.com/help/article/cli-security/> for more information.

### Caching
Out of the box, the extension caches the **visible and non-sensitive** part of your vault to ensure faster access. Secrets like passwords, identity fields, credit card information, secret notes and others sensitive data are **never** saved. Even though the cache will never have any sensitive information, the data is also encrypted with a key derived from your master password. 

If you wish to disable the caching feature, you can **always** do so in the extension preferences.

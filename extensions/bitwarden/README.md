<div align="center">
  <img src="https://raw.githubusercontent.com/raycast/extensions/main/extensions/bitwarden/assets/bitwarden-512.png" width="128" height="128" />

  <br/>

  # Bitwarden Vault

  Access your Bitwarden vault directly from Raycast

  🔎 &nbsp; Search your vault &nbsp; 📋 &nbsp; Copy and paste any field &nbsp; 🔑 &nbsp; Generate passwords and TOTP codes &nbsp; ⭐ &nbsp; Mark items as favorites
</div>

<br/>

## Setup

Before you're able to use this extension, you need to follow these steps:

#### Step 1 - Install the Bitwarden CLI

> ##### Option 1 - Using Homebrew
> ```sh
> brew install bitwarden-cli
> ```
> ##### Option 2 - Downloading it from the [official page](https://bitwarden.com/help/cli/#download-and-install)

#### Step 2 - Set your API secrets in the extension preferences. 
> Get them from your account [security settings](https://vault.bitwarden.com/#/settings/security/security-keys).
For more information check the official [documentation](https://bitwarden.com/help/personal-api-key/#get-your-personal-api-key).

#### You're all set! 🎉

### Self-hosted Instance

This extension connects to Bitwarden-hosted servers by default, but can be configured to use a self-hosted Bitwarden instance instead. If the self-hosted Bitwarden server requires a self-signed TLS certificate, add the path to the extension preferences.

## Security

The extension relies on the Bitwarden CLI, so every security consideration that applies to the CLI applies to the extension as well. See <https://bitwarden.com/help/article/cli-security/> for more information.

#### Caching
Out of the box, the extension caches the **visible and non-sensitive** part of your vault to ensure faster access. Secrets like passwords, identity fields, credit card information, secret notes and others sensitive data are **never** saved. Even though the cache will never have any sensitive information, the data is also encrypted with a key derived from your master password. 

If you wish to disable the caching feature, you can **always** do so in the extension preferences.

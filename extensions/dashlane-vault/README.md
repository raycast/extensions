<div align="center">
  <img src="https://raw.githubusercontent.com/raycast/extensions/main/extensions/dashlane/assets/dashlane-512.png" width="128" height="128" />

  <br/>

# Dashlane Vault

Access your Dashlane vault directly from Raycast

🔎 &nbsp; Search your vault &nbsp; 📋 &nbsp; Copy and paste fields &nbsp; 🔑 &nbsp; Generate TOTP codes &nbsp; ⭐ &nbsp; Mark items as favorites

</div>

<br/>

## Setup

Before you're able to use this extension, you need to following these steps:

### Step 1 - Install the Dashlane CLI

Follow the install steps from the official [Dashlane CLI documentation](https://dashlane.github.io/dashlane-cli/install).

```sh
brew install dashlane/tap/dashlane-cli
```

### Step 2 - Login to your Dashlane account

Follow the authentication steps from the official [Dashlane CLI documentation](https://dashlane.github.io/dashlane-cli/personal/authentication).

### You're all set! 🎉

## Security

The extension relies on the Dashlane CLI, so every security consideration that applies to the CLI applies to the extension as well. See <https://dashlane.github.io/dashlane-cli> for more information.

### Caching

Out of the box, the extension caches the **non-sensitive** part of your vault to ensure faster access. Secrets like passwords, identity fields secret notes and others sensitive data are **never** saved.

### Limitations

The Dashlane CLI supports an [option](https://dashlane.github.io/dashlane-cli/personal/authentication#options) `save-master-password` to request the user's master password. This option is not supported by the extension yet, so you'll need to keep the default which is `true`.

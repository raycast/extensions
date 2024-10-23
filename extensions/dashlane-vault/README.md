<div align="center">
  <img src="https://raw.githubusercontent.com/raycast/extensions/main/extensions/dashlane-vault/assets/dashlane-512.png" width="128" height="128" />

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

### Step 3 - Healtcheck

If the extension is not working as expected check out the **Settings** and **Troubleshooting** sections.

### You're all set! 🎉

## Settings

### CLI Path

Retrieve the path to the Dashlane CLI by running the following command in your terminal:

```sh
which dcli
```

Set the path to the Dashlane CLI in the extension preferences of Raycast. Open Raycast preferences, navigate to the Dashlane Vault extension, and specify the path to the Dashlane CLI. You can also use the following shortcut to jump directyl to the extenions settings: `⌥ + ⌘ + ,`

### Master Password

The Dashlane CLI supports an [option](https://dashlane.github.io/dashlane-cli/personal/authentication#options) `save-master-password` to request the user's master password. If set to false, every time someone wants to access your vault, the master password needs to be inserted. If you are using this, you can set you master password in the preferences of this extension, which are stored in an [encrypted database](https://developers.raycast.com/information/security#data-storage).

```sh
dcli configure save-master-password false
```

### Biometrics

The Dashlane CLI supports an [option](https://dashlane.github.io/dashlane-cli/personal/authentication#unlock-with-biometrics) `user-presence` to use biometrics to access your vault. If set to `biometric`, every time someone wants to access your vault, you will be ask to unlock your vault with your biometrics. If you are using this, you must enable the checkbox in the preferenecs of this extension. Otherwise the extension is not working as expected.

## Troubleshooting

To troubleshoot issues with syncing your vault or if passwords and notes are not appearing, please follow these steps:

1. Check if the Dashlane CLI is installed by running the following command in your terminal:

```sh
dcli --version
```

2. Verify if you are logged in by running the following command in your terminal:

```sh
dcli accounts whoami
```

3. Retrieve the path to the Dashlane CLI by running the following command in your terminal:

```sh
which dcli
```

4. Set the path to the Dashlane CLI in the extension preferences of Raycast. Open Raycast preferences, navigate to the Dashlane Vault extension, and specify the path to the Dashlane CLI.

### Unsupported Versions

Currently there is a version (v6.2415.0) of the Dashlane CLI with a bug, that can only be fixed by upgrading the CLI.

## Security

The extension relies on the Dashlane CLI, so every security consideration that applies to the CLI applies to the extension as well. See <https://dashlane.github.io/dashlane-cli> for more information.

### Caching

Out of the box, the extension caches the **non-sensitive** part of your vault to ensure faster access. Secrets like passwords, identity fields secret notes and others sensitive data are **never** saved.

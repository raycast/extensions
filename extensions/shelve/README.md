<p align="center">
    <img src="./assets/extension-icon.png" width="200" height="200" />
</p>

# Shelve - Secure Secret Sharing

This is an extension for [vault.shelve.cloud](https://vault.shelve.cloud/). Shelve makes it easy to securely share sensitive information such as passwords, API keys, or other secrets without requiring an account. Set expiration times, control read limits, and ensure encrypted transmission.

- **Secure Encryption**: All secrets are encrypted before transmission
- **Expiration Control**: Set automatic expiration (1 day, 7 days, 30 days, or indefinitely)
- **Read Limits**: Control how many times a secret can be accessed (1-100 reads)
- **No Account Required**: Share secrets without creating accounts or logging in

### Sharing a Secret

1. Open Raycast and search for "Encrypt"
2. Enter your secret text, password, or sensitive information
3. Set the maximum number of reads (1-100)
4. Choose when it expires (1d, 7d, 30d, or indefinitely)
5. Click "Encrypt Secret"
6. A secure URL is automatically copied to your clipboard

### Retrieving a Secret

1. Open Raycast and search for "Decrypt"
2. Paste the vault URL you received (or just the secret ID)
3. Click "Decrypt Secret"
4. The secret is automatically decrypted and copied to your clipboard

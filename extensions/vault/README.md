# Vault Extension

The Vault extension allows you to manage your secrets from [Vault](https://www.vaultproject.io).

> Vault secures, stores, and tightly controls access to tokens, passwords, certificates, API keys, and other secrets in modern computing.

## Development / Testing

- Install the Vault CLI: `brew install vault`
- Start the Vault server: `vault server -dev -dev-root-token-id="root"`
- Create a new secret: `vault kv put secret/helloworld foo=bar`
- Use `http://localhost:8200` as address and `root` as token in the extension to access the created secret.

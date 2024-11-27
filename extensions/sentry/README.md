## Sentry

An extension to quickly search unresolved issues in Sentry. This can be handy to stay on top of errors and squash these nasty bugs.

## How to Get Access Token

The extension needs an Auth Token to communicate with the Sentry API. When you use the extension for the first time, it prompts you for this token. Follow these steps to create one:

1. Open https://sentry.io/settings/account/api/auth-tokens/ or https://example.com/settings/account/api/auth-tokens if you want to use a self-hosted Sentry instance (replace "example.com" with the domain name of your self-hosted instance)
2. Click the "Create New Token" button in the top right corner
3. Select at least the "event:write", "project:read", and "org:read" scopes
4. Press the "Create Token" button in the bottom right corner
5. Copy your new token and paste it into Raycast's required preference item of the extension
s
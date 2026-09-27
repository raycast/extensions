# Getting Your Mercury API Token

1. Open [app.mercury.com/settings/tokens](https://app.mercury.com/settings/tokens), or click your organization in the top left, then **All Settings → Tokens**.
2. Click **Create an API Token** and choose **Read Only**. That's all this extension needs, and it doesn't require an IP whitelist.
3. Copy the token (Mercury only shows it once), then open **Manage Accounts** in Raycast, choose **Add Account**, and paste it.
4. Have a personal and a business account? Mercury issues a token per account, so repeat for each one.

## Good to Know

- **Unused tokens are deleted.** Mercury removes a token that hasn't been used for 45 days, and emails your admins 7 days beforehand. If the extension suddenly stops authenticating, generate a new token.
- **Treat the token like a password.** If it leaks, revoke it on the same page and create a new one.

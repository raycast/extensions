# Okta App Manager

## Onboarding

To use this extension, you need an Okta API token and your Okta domain.

### 1. Get your Okta Domain
Your Okta domain is the URL you use to sign in to Okta (e.g., `dev-123456.okta.com` or `company.okta.com`).

### 2. Create an API Token
1. Log within your Okta Admin Console.
2. Go to **Security** > **API**.
3. Click the **Tokens** tab.
4. Click **Create Token**.
5. Give your token a name (e.g., "Raycast Extension") and copy the token value.

### 3. Add your Environment
1. Open Raycast and run the **Manage Environments** command.
2. Press `Cmd+N` or select **Create Environment**.
3. Enter a name for your environment (e.g., "Production").
4. Enter your **Okta Domain** and **API Token**.
5. Save the environment.

You can add multiple environments and switch between them using the **Manage Environments** command.
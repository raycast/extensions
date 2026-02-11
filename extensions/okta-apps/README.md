# Okta Apps

Access your Okta applications directly from Raycast.

## Features

- **List Apps**: View all applications assigned to you in Okta.
- **Menu Bar**: Quick access to your apps from the menu bar.
- **Fallback Search**: Search for Okta apps directly from Raycast's root search when no local results are found.
- **Secure**: Uses OAuth 2.0 with PKCE for secure authentication.

## Prerequisites

To use this extension, you need to create an **OIDC Application** in your Okta Organization.

### 1. Create Okta OIDC App
1.  Log in to your **Okta Admin Console**.
2.  Go to **Applications** > **Applications**.
3.  Click **Create App Integration**.
4.  Select **OIDC - OpenID Connect** as the Sign-in method.
5.  Select **Native Application** as the Application type. 
    *   *Note: Do not select "Web Application", as that requires a client secret which we do not use.*
6.  Click **Next**.
7.  **App Integration Name**: Enter "Raycast Okta Apps" (or similar).
8.  **Grant type**: Ensure **Authorization Code** is checked. **Refresh Token** is recommended but optional.
9.  **Sign-in redirect URIs**: Add `https://raycast.com/redirect?packageName=Extension`
10. **Sign-out redirect URIs**: Add `https://raycast.com/redirect?packageName=Extension`
11. **Assignments**: Select **Allow everyone in your organization to access** (or assign to specific users/groups).
12. Click **Save**.
13. Copy the **Client ID** from the General tab.

### 2. Grant API Scopes
1.  In your new app, go to the **Okta API Scopes** tab.
2.  Find and **Grant** the following scopes:
    - `okta.users.read`
    - `okta.users.read.self`
    - `okta.apps.read` (optional, but good to have)
    - `openid`, `profile`, `email` (usually granted by default)

## Configuration

1.  Open Raycast and search for **Okta Apps**.
2.  Press `Cmd + ,` to open **Extension Preferences**.
3.  **Okta Domain**: Enter your Okta domain (e.g., `dev-123456.okta.com`). *Do not include `https://`*.
4.  **Client ID**: Enter the Client ID you copied from the Okta Admin Console.

## Usage

### List Apps
- Run the **List Okta Apps** command.
- Press `Enter` to open an app in your browser.
- Press `Cmd + .` to copy the app link or see other actions.

### Menu Bar
- Run the **Okta Apps Menu Bar** command (or enable it in Raycast Settings) to see the Okta icon in your menu bar.
- Click the icon to see a dropdown of your apps.

### Fallback Search
1.  Go to **Raycast Settings** > **Extensions** > **Okta Apps**.
2.  Select the **List Okta Apps** command.
3.  Enable **Fallback Commands**.
4.  Now, when you type a query in Raycast that has no matches, you can select "Search Okta apps" to search your Okta apps directly.

## Troubleshooting

- **Error: 400 Bad Request (Invalid Client)**: Ensure your Okta App is a **Native Application**. Web Apps require a client secret.
- **Error: 403 Forbidden**: Ensure you have granted the `okta.users.read` and `okta.users.read.self` scopes in the Okta Admin Console.
- **Error: PKCE verification failed**: This can happen if multiple auth requests are triggered. Try running the command again.

## License
MIT
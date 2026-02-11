import { Detail } from "@raycast/api";

const markdown = `
# How to Setup Okta Apps Extension

To use this extension, you need to create an **OIDC Application** in your Okta Organization.

## 1. Create Okta OIDC App
1.  Log in to your **Okta Admin Console**.
2.  Go to **Applications** > **Applications**.
3.  Click **Create App Integration**.
4.  Select **OIDC - OpenID Connect** as the Sign-in method.
5.  Select **Native Application** as the Application type. 
    *   *Note: Do not select "Web Application", as that requires a client secret which we do not use.*
6.  Click **Next**.
7.  **App Integration Name**: Enter "Raycast Okta Apps" (or similar).
8.  **Grant type**: Ensure **Authorization Code** is checked. **Refresh Token** is recommended but optional.
9.  **Sign-in redirect URIs**: Add \`https://raycast.com/redirect?packageName=Extension\`
10. **Sign-out redirect URIs**: Add \`https://raycast.com/redirect?packageName=Extension\`
11. **Assignments**: Select **Allow everyone in your organization to access** (or assign to specific users/groups).
12. Click **Save**.
13. Copy the **Client ID** from the General tab.

## 2. Grant API Scopes
1.  In your new app, go to the **Okta API Scopes** tab.
2.  Find and **Grant** the following scopes:
    - \`okta.users.read\`
    - \`okta.users.read.self\`
    - \`okta.apps.read\` (optional, but good to have)
    - \`openid\`, \`profile\`, \`email\` (usually granted by default)

## 3. Configure Extension
1.  Open Raycast and search for **Okta Apps**.
2.  Press \`Cmd + ,\` to open **Extension Preferences**.
3.  **Okta Domain**: Enter your Okta domain (e.g., \`dev-123456.okta.com\`). *Do not include \`https://\`*.
4.  **Client ID**: Enter the Client ID you copied from the Okta Admin Console.
`;

export default function Command() {
  return <Detail markdown={markdown} />;
}

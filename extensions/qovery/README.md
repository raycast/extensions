# Qovery Raycast Extension

Find and open services across every Qovery organization available to your user account.

## Features

- Sign in to Qovery with the browser (GitHub, Google, GitLab, and the other providers enabled by Qovery)
- OAuth 2.0 Authorization Code flow with PKCE; no API token preference
- Secure access and refresh-token storage through Raycast's OAuth API
- Services from all accessible organizations loaded in parallel
- Organization filter and global search across services, projects, environments, and organizations
- Direct links to the current Qovery Console service overview
- Public links for applications, containers, and Helm services
- Copy actions for service, project, and environment IDs

## OAuth Configuration

The extension uses Qovery's public Auth0 client, the `https://core.qovery.com` audience, and this static Raycast callback:

```text
https://raycast.com/redirect/extension
```

That URL must be present in the Auth0 application's **Allowed Callback URLs**. The client must allow the Authorization Code and Refresh Token grant types. For production, a dedicated public/native Auth0 client for the Raycast extension is preferable; update `CLIENT_ID` in `src/oauth.ts` if one is created.

No client secret belongs in the extension. PKCE protects the authorization-code exchange.

## Usage

1. Run **Find Services** in Raycast.
2. Complete the Qovery sign-in in your browser.
3. Search across all your services or use the dropdown to select an organization.
4. Open the action panel to visit the Console, view links, copy IDs, refresh, or sign out.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## License

MIT

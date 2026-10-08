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

## Usage

1. Run **Find Services** in Raycast.
2. Complete the Qovery sign-in in your browser.
3. Search across all your services or use the dropdown to select an organization.
4. Open the action panel to visit the Console, view links, copy IDs, refresh, or sign out.

## Privacy and Security

The extension uses Qovery's secure browser sign-in. It never asks for or stores a Qovery API token.

## License

MIT

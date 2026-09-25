# Jumpseat for Raycast

See your and your friends' upcoming Jumpseat flights without leaving Raycast, or keep your next flight in the menu bar with an adaptive countdown and live operational status.

View routes, flight numbers, departure times, airports, gates, terminals, and aircraft details at a glance. Your own flight view also includes your private seat and booking information; friends' booking details are never requested or displayed.

Upcoming Flights and Friends' Upcoming Flights are available on macOS and Windows. The Next Flight menu bar command is available on macOS only because Raycast menu bar commands are not supported on Windows.

## Local development

Requirements:

- Raycast
- Node.js 22.22.2 or newer
- npm 7 or newer

Install dependencies and start development mode:

```bash
npm install
npm run dev
```

The extension is pinned to the official Jumpseat API resource (`https://api.withjumpseat.com`) and OAuth authority (`https://auth.withjumpseat.com`). They are not user-configurable; deployments may set `JUMPSEAT_AUTH_ORIGIN` to override only the OAuth authority and may temporarily allow prior HTTPS origins with the comma-separated `JUMPSEAT_TRUSTED_AUTH_ORIGINS`. Origins with HTTP, credentials, ports, paths, queries, or fragments are rejected. Fresh authorization first validates the authority's OAuth metadata and uses central OAuth only when its exact endpoints are advertised. A discovery `404` selects the released web/API flow; other discovery failures prompt a retry. Central credentials persist that validated issuer and always refresh and revoke at it, rather than at a future configured origin. Missing issuer metadata is recovered only for the canonical production authority; other ambiguous credentials require reauthorization. Already-issued sessions continue on their stored protocol and issuer.

On first launch, choose **Connect Jumpseat**, sign in with the normal Jumpseat web flow, and confirm the connection. New authorization uses OAuth authorization code plus PKCE S256 with client ID `jumpseat-raycast`, the Raycast callback, API resource `https://api.withjumpseat.com`, and the `flights:upcoming:read` integration scope. Raycast securely stores the resulting short-lived access token and rotating refresh token. Transient network, rate-limit, and server failures preserve stored credentials, while `401` and OAuth `invalid_grant` clear them. Whenever extension code disconnects an account, it best-effort revokes the refresh token at the authority that issued it before removing local credentials; Raycast's automatically provided OAuth logout preference remains Raycast-managed.

## Checks

```bash
npm test
npm run lint
npm run build
```

`npm run lint` also validates the Raycast Store manifest and maintainer account.

## License

Released under the MIT License by Altitute Pte. Ltd.

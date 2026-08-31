# Jumpseat for Raycast

See your upcoming Jumpseat flights without leaving Raycast, or keep your next flight in the menu bar with an adaptive countdown and live operational status.

View routes, flight numbers, departure times, airports, gates, terminals, seats, booking information, and aircraft details at a glance.

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

Raycast will ask for:

- **Jumpseat API URL**: defaults to `https://api.withjumpseat.com`.
- **Jumpseat Web URL**: defaults to `https://app.withjumpseat.com` and is used for browser sign-in.

For safety, the extension only connects to the official Jumpseat API and web origins. Changing either preference clears the stored authorization and the extension rejects the unrecognized configuration.

On first launch, choose **Connect Jumpseat**, sign in with the normal Jumpseat web flow, and confirm the connection. Raycast securely stores the resulting short-lived access token and rotating refresh token. The access token is limited to the `flights:upcoming:read` integration scope.

## Checks

```bash
npm test
npm run lint
npm run build
```

`npm run lint` also validates the Raycast Store manifest and maintainer account.

## License

Released under the MIT License by Altitute Pte. Ltd.

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

The extension is pinned to the official Jumpseat API and web origins. They are not user-configurable.

On first launch, choose **Connect Jumpseat**, sign in with the normal Jumpseat web flow, and confirm the connection. Raycast securely stores the resulting short-lived access token and rotating refresh token. The access token is limited to the `flights:upcoming:read` integration scope. Use Raycast's automatically provided OAuth logout preference to disconnect.

## Checks

```bash
npm test
npm run lint
npm run build
```

`npm run lint` also validates the Raycast Store manifest and maintainer account.

## License

Released under the MIT License by Altitute Pte. Ltd.

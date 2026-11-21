# AWS SSO Status

AWS IAM Identity Center status and quick sign-in, right from Raycast.

- **Menu Bar** — cloud icon with remaining time or ✓ / ✕, plus profile switching.
- **Status** — profiles, credential expiration, and last successful check.
- **Login** — sign in to your primary profile or choose another.
- **Diagnostics** — inspect local config and AWS CLI setup.

## Install

Requires macOS, Raycast, Node.js/npm, and a current [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html). Configure your SSO profile with `aws configure sso`.

```sh
git clone https://github.com/burger66leo/raycast-aws-sso-status.git
cd raycast-aws-sso-status
npm ci
npm run dev
```

Open **AWS SSO Menu Bar** in Raycast and enable Background Refresh. Choose your display style and optional sign-in reminders in extension preferences.

Available from GitHub; Raycast Store submission is pending.

## Privacy

AWS data is processed locally. No analytics, telemetry, or credential storage by the extension. AWS CLI handles authentication and its own caches; this extension caches only profile/status metadata.

> Remaining time is the current AWS credential lifetime, not the SSO browser reauthentication deadline.

[Usage & limitations](docs/GUIDE.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [MIT License](LICENSE)

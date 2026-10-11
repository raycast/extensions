# Usage & limitations

## Profiles

Profiles are discovered from `~/.aws/config`, or `AWS_CONFIG_FILE` visible to Raycast. Modern `sso_session` and legacy SSO profiles are supported. Configure one with `aws configure sso`; see the [AWS setup guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html).

Only direct IAM Identity Center account/role profiles are supported. Static keys, role chaining, external credential processes, and bearer-only sessions are excluded.

Choose a Primary Profile or switch directly in the menu. This changes only the extension's selection, not your shell or AWS configuration. Profile Filter accepts comma-separated names. Use Preference Default clears a menu selection.

## Status and refresh

- Remaining time is resolved AWS credential TTL. AWS CLI may refresh it without browser authentication.
- ✓ means recently confirmed usable credentials. ✕ includes expired, unknown, or unavailable states; inspect the dropdown for the reason.
- Opening the menu retains the previous result. Checks are cached for one minute. Older results are marked stale; failed checks retain historical expiration and Last Successful Check.
- Raycast schedules background updates approximately every minute. Sleep and system scheduling may delay them.
- Connection failures retry after 1, 2, 4, 8, then 15 minutes. Manual Refresh bypasses backoff.
- Shared sessions serialize checks and browser login across commands. Different account/role credentials are resolved independently; equivalent profile aliases share status metadata.

## Login and notifications

AWS SSO Login accepts an optional profile name and otherwise uses the selected primary profile. Login opens your browser through AWS CLI, has a three-minute timeout, and refreshes related profiles afterward. Failed login Toasts provide recovery actions.

Sign-In Reminder is off by default. When enabled, it shows one Raycast Toast/HUD after a previously usable session requires login. It does not use macOS Notification Center; HUD actions may be unavailable when Raycast is closed.

Open AWS Console opens the configured AWS access portal, where you choose an account/role. It does not create credential-bearing federation links.

## Troubleshooting

Open **AWS SSO Diagnostics** to inspect the config path, CLI path/version, and discovered profiles. Raycast's environment may differ from your shell; set AWS CLI Path for custom installations. Missing profiles usually indicate an unconfigured SSO profile, a different config path, or Profile Filter.

This Store version uses US English. The GitHub main branch offers optional multilingual UI.

## Security

The extension never logs raw AWS output or stores access keys, secrets, or tokens. AWS CLI manages authentication, AWS network requests, and its own caches. No telemetry or data is sent to the author.

Raycast Cache stores profile/status metadata and the selected profile. Private local JSON files store expiration, retry counters, and reminder state. No AWS config, shared credentials, or SSO cache is modified directly. CLI execution uses argument arrays, timeouts, and bounded output.

Status is credential resolution, not an STS identity check or a guarantee of permission to every service. Account IDs come from config. See [Security](../SECURITY.md) for private vulnerability reporting.

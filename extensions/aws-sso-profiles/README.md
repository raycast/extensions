# AWS SSO Profiles

Browse and open your AWS SSO accounts in the browser — directly from Raycast.

This extension reads your `~/.aws/config` file, groups profiles by AWS account, and lets you quickly open the AWS Management Console for any account and role combination. It supports AWS multi-session, so you can have up to 5 console sessions open side by side.

## Features

- **Account List** — All your AWS SSO accounts in one place, grouped by account ID with smart display names derived from profile names
- **Role Selection** — Drill into any account to see all available IAM roles (e.g., OpsRO, OpsRW, AdminAccess)
- **Multi-Session** — Select up to 5 accounts (⌘S) and open them all at once (⌘⏎) using [AWS multi-session](https://docs.aws.amazon.com/awsconsolehelpdocs/latest/gsg/multisession.html)
- **Region Support** — Open consoles in your default region or pick from 17 built-in AWS regions (⌘R). Configure additional regions to always show via preferences
- **Stage Detection** — Automatically detects environments (production, staging, dev, etc.) from account names and color-codes them
- **Usage Tracking** — Optionally track how often you open each account/role and sort by most-used
- **Copy Actions** — Quickly copy Account ID (⌘C), Profile Name (⌘⇧C), Role Name (⌘⇧R), or an `export AWS_PROFILE=...` command (⌘⇧E)

## Setup

1. **Install the extension** from the Raycast Store
2. **Ensure you have AWS SSO configured** in `~/.aws/config` with profiles that include `sso_account_id`, `sso_role_name`, and either an inline `sso_start_url` or an `sso-session` reference

Example `~/.aws/config`:

```ini
[sso-session my-sso]
sso_start_url = https://my-org.awsapps.com/start/
sso_region = us-east-1
sso_registration_scopes = sso:account:access

[profile dev-admin]
sso_session = my-sso
sso_account_id = 111111111111
sso_role_name = AdministratorAccess
region = eu-central-1

[profile prod-readonly]
sso_session = my-sso
sso_account_id = 222222222222
sso_role_name = ReadOnlyAccess
region = eu-central-1
```

> **Tip:** You can generate this config automatically with tools like [assume-it](https://github.com/AyoubIssique/assume-it) or `aws configure sso`.

3. **Open Raycast** and search for "List AWS SSO Profiles"

## Preferences

| Preference | Description | Default |
|---|---|---|
| **AWS Config File Path** | Path to your AWS config file | `~/.aws/config` |
| **Additional Regions** | Comma-separated list of extra regions to show for each role (e.g., `us-east-2, eu-west-1`) | — |
| **Show Usage Count** | Display badges showing how many times each account/role has been opened | Off |

## Keyboard Shortcuts

### Account List

| Shortcut | Action |
|---|---|
| ↵ | Show roles for the selected account |
| ⌘O | Quick-open the default role in the console |
| ⌘R | Open in a specific region |
| ⌘S | Toggle multi-session selection |
| ⌘⏎ | Open all selected accounts (up to 5) |
| ⌘⇧X | Clear multi-session selection |
| ⌘C | Copy Account ID |

### Role List

| Shortcut | Action |
|---|---|
| ↵ | Open the console for this role |
| ⌘R | Open in a specific region |
| ⌘C | Copy Account ID |
| ⌘⇧C | Copy Profile Name |
| ⌘⇧R | Copy Role Name |
| ⌘⇧E | Copy `export AWS_PROFILE=...` command |

## Requirements

- **macOS** — This extension is macOS-only
- **AWS SSO configured** — Your `~/.aws/config` must contain SSO profiles with `sso_account_id` and `sso_role_name`
- **Active SSO session** — Log in via `aws sso login` or your SSO tool before using the extension

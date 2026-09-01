# App Store Connect

Perform tasks from App Store Connect without leaving Raycast — check app review status, manage TestFlight builds and beta groups, edit test information, and manage team members.

## Setup

The extension talks to the App Store Connect API, which needs an API key. You are asked for one the first time you run any command, and you can add more later from **Manage API Keys**.

Two kinds of key work, and they are configured differently.

### Team key

Created in App Store Connect under **Users and Access → Integrations → App Store Connect API**. A team key is shared across your team and is scoped by the role you give it.

You will need:

| Field | Where to find it |
| --- | --- |
| Issuer ID | Shown above the key list on the same page |
| Key ID | The key's row in the list |
| Private key | The `AuthKey_XXXXXXXXXX.p8` file — **downloadable only once**, when you create the key |

### Individual key

Generated from your own profile in App Store Connect: **your account → Individual API Key**. It is scoped to your own permissions, never expires, and only one can be active at a time.

An individual key has **no Issuer ID** — pick **Individual Key** as the key type and the field disappears. You only need the Key ID and the `.p8` file.

> Keys are stored locally by Raycast and are only ever sent to Apple.

Apple's documentation: [Creating API Keys for App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api)

## Commands

| Command | What it does |
| --- | --- |
| **View App Status** | App review states across your apps, filtered by status and platform, with the option to release versions that are pending developer release |
| **Manage Builds** | Browse builds per version, edit "What to Test", manage export compliance, expire a build, and submit for beta review |
| **Manage Beta Groups** | Create and delete beta groups, add testers individually or in bulk, and control which builds a group can install |
| **Edit Test Information** | Beta app review details, localized descriptions, and the beta license agreement |
| **Manage Team Members** | View team members and their roles, invite new members, edit visible apps, and revoke invitations |
| **Manage API Keys** | Switch between stored API keys, add another, or remove one |

## Troubleshooting

**"This API key's role doesn't allow that."** The key is valid but its role lacks permission for the action. Team keys need Admin or App Manager for most write operations; an individual key inherits your own permissions.

**A build won't add to a beta group.** Only builds that have finished processing can be added. The build picker shows the state next to any build that isn't ready.

**Nothing loads after adding a key.** Confirm the Key ID matches the `.p8` file you selected, and that a team key's Issuer ID is the one shown above the key list rather than the key's own ID.

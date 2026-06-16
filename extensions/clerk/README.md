# Clerk

Browse and lightly administer Clerk users and organizations across multiple, switchable Clerk instances, directly from Raycast.

## Commands

- **Manage Apps** — add/edit/remove Clerk instances and pick the active one. Open the Clerk dashboard, copy a secret key, and add it (auto-detected from your clipboard).
- **Switch Active App** — quickly change which instance is active.
- **Search Users** — search users, view details and sessions, ban/unban, revoke sessions, delete, and view a user's organizations.
- **Search Organizations** — search organizations, view/manage members (change role, remove), create and delete organizations.

## Authentication

Each "app" is a Clerk **instance**, identified by its secret key (`sk_live_…` / `sk_test_…`) from the [API keys page](https://dashboard.clerk.com/last-active?path=api-keys). A Clerk secret key is scoped to a single instance; there is no public API to list your applications, so instances are added manually.

## Security note

Secret keys are stored in Raycast **LocalStorage**, which is local to your machine but **not encrypted at rest**. Keys are only sent to `api.clerk.com`. Remove an app from **Manage Apps** to delete its stored key.

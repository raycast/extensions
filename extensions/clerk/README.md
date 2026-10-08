# Clerk

Browse and lightly administer Clerk users and organizations across multiple, switchable Clerk instances, directly from Raycast.

## Commands

- **Manage Apps** — add/edit/remove Clerk instances, pick the active one, and see each instance's user/organization counts (with a key-error indicator when a stored key no longer works). Open the Clerk dashboard, copy a secret key, and add it (auto-detected from your clipboard).
- **Search Users** — search users, view details and sessions, ban/unban, revoke sessions, delete, view a user's organizations, **create users**, **edit users** (name, username, primary email, public/private metadata), **add email addresses**, and generate **sign-in / impersonation tokens**.
- **Search Organizations** — search organizations (with member counts) and open an **organization details page**: copy-on-click identifier fields (Org ID, slug, public/private metadata) with an overview pane, plus actions to view the member directory, change a member's role, remove members, view a member's user details, edit the organization, manage its **invitations**, and open it in the dashboard. Create and delete organizations from the search list.
- **Invitations** — list, create (with expiry, redirect URL, and email toggle), and revoke instance invitations.
- **Access Lists** — manage allowlist and blocklist identifiers (toggle via the search-bar dropdown).

In **Search Users** and **Search Organizations**, when you have more than one instance configured, a dropdown in the top-right of the search bar switches the active instance in place. User and organization rows include **Open in Clerk Dashboard**.

## Authentication

Each "app" is a Clerk **instance**, identified by its secret key (`sk_live_…` / `sk_test_…`) from the [API keys page](https://dashboard.clerk.com/last-active?path=api-keys). A Clerk secret key is scoped to a single instance; there is no public API to list your applications, so instances are added manually.

## Security note

Secret keys are stored in Raycast **LocalStorage**, which is local to your machine but **not encrypted at rest**. Keys are only sent to `api.clerk.com`. Remove an app from **Manage Apps** to delete its stored key.

**Open in Clerk Dashboard** uses Clerk's `~` (last-active instance) deep links. The dashboard opens whichever instance was last active in your browser, which may differ from the instance active in this extension if you manage more than one — there is no public API to map a secret key to a dashboard instance.

**Editing metadata** replaces the entire public/private metadata object with the JSON you enter (it is not a deep merge). Leave a metadata field blank to clear it.

**Generated tokens are secrets.** Sign-in and impersonation tokens (and their URLs) grant access to sign in as the user — treat the copied values like passwords.

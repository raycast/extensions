# Clerk Raycast Extension — Design Spec

- **Date:** 2026-06-16
- **Status:** Approved (ready for implementation planning)
- **Owner:** filiph

## 1. Purpose

A Raycast extension to browse and lightly administer Clerk data across multiple
Clerk instances. It lets you search users and organizations in a selected Clerk
instance, drill into org membership, and perform a curated set of
API-supported mutations. Adding a Clerk instance ("authenticating") is made as
frictionless as possible: open the dashboard, copy the secret key, one-tap add.

## 2. Key constraints & decisions

These were settled during brainstorming and drive the design:

1. **An "app" is a Clerk *instance*, not a Clerk *application*.** A Clerk secret
   key authenticates the Backend API and is scoped to exactly one instance (one
   application + one environment, dev *or* prod). There is **no public Backend
   API to enumerate your applications** — the Dashboard uses private endpoints.
   Therefore the extension manages a user-curated list of instances, each added
   via its secret key.
2. **Multiple instances, switchable.** The user adds a secret key + friendly
   name per instance and selects which one is "active". All data commands act on
   the active instance.
3. **Read + curated, API-supported mutations.** v1 browses everything and offers
   a curated set of high-value mutations (ban/unban/delete user, revoke
   sessions, create/delete org, change member role, remove member). Instance
   settings that are Dashboard-only (auth providers, themes, etc.) are out of
   scope — they are not reachable via the Backend API.
4. **Data layer: `@clerk/backend` SDK + `@raycast/utils` hooks.** Official, typed,
   and its `{ data, totalCount }` paginated shape maps directly onto Raycast's
   pagination.
5. **Storage: Raycast LocalStorage.** A dynamic, growable list of instances
   cannot use Raycast Preferences (fixed schema). Apps are stored in LocalStorage,
   which is local to the machine but **not encrypted at rest**. This tradeoff is
   documented in the README. Keys never leave the machine except to call
   `api.clerk.com`.

## 3. Commands (manifest)

The `package.json` `commands` array is rewritten to:

| name                   | title              | mode | description |
|------------------------|--------------------|------|-------------|
| `manage-apps`          | Manage Apps        | view | Add, edit, remove, and activate Clerk instances. This is the auth command. |
| `switch-app`           | Switch Active App  | view | Quickly switch which configured instance is active. |
| `search-users`         | Search Users       | view | Search and manage users in the active instance. |
| `search-organizations` | Search Organizations | view | Search organizations and manage members in the active instance. |

The placeholder `view-users` command and `src/view-users.tsx` are removed.

`@clerk/backend` is added as a dependency. No Preferences are declared (storage is
LocalStorage).

## 4. File layout

```
src/
  manage-apps.tsx            # Command: Manage Apps (auth)
  switch-app.tsx             # Command: Switch Active App
  search-users.tsx           # Command: Search Users
  search-organizations.tsx   # Command: Search Organizations
  lib/
    storage.ts               # apps + activeAppId CRUD over LocalStorage
    clerk.ts                 # client factory (memoized), key detection, dashboard URL
    errors.ts                # normalize ClerkAPIResponseError -> toast
    hooks.ts                 # useApps, useActiveApp, usePaginatedClerkList
  components/
    auth-guard.tsx           # shared empty-state when no app configured/active
    app-form.tsx             # add/edit a Clerk app (clipboard-aware)
    user-detail.tsx          # Detail for one user
    user-orgs.tsx            # a user's org memberships
    org-members.tsx          # members of one org (drill-in)
  types.ts                   # ClerkApp and shared types
```

## 5. Core types

```ts
// types.ts
export type InstanceType = "development" | "production";

export type ClerkApp = {
  id: string;                 // crypto.randomUUID()
  name: string;               // friendly label, editable
  instanceType: InstanceType; // derived from secret-key prefix
  secretKey: string;          // sk_test_… / sk_live_…
};
```

## 6. Storage (`lib/storage.ts`)

LocalStorage keys:
- `clerk.apps` — JSON-serialized `ClerkApp[]`
- `clerk.activeAppId` — `string`

API:
- `getApps(): Promise<ClerkApp[]>`
- `saveApps(apps: ClerkApp[]): Promise<void>`
- `addApp(app: ClerkApp): Promise<void>` — appends; if it is the first app, sets it active.
- `updateApp(app: ClerkApp): Promise<void>`
- `removeApp(id: string): Promise<void>` — if it was active, clears or reassigns active to the first remaining app.
- `getActiveAppId(): Promise<string | undefined>`
- `setActiveAppId(id: string): Promise<void>`
- `getActiveApp(): Promise<ClerkApp | undefined>`

Serialization is centralized here so it is unit-testable.

## 7. Clerk client & detection (`lib/clerk.ts`)

```ts
export const DASHBOARD_API_KEYS_URL =
  "https://dashboard.clerk.com/last-active?path=api-keys";

// Matches a Clerk secret key.
export function isClerkSecretKey(text: string): boolean; // ^sk_(test|live)_[A-Za-z0-9]+$ (trimmed)

export function instanceTypeFromKey(key: string): InstanceType; // sk_live_ -> production, else development

// Memoized by secret key so repeated reads reuse one client.
export function clientFor(app: ClerkApp): ClerkClient; // createClerkClient({ secretKey })
```

A suggested default name from a key, e.g. `Production · a1b2` (instance type +
last 4 chars), is generated for the zero-typing add flow.

## 8. Hooks (`lib/hooks.ts`)

- `useApps()` — `useCachedPromise(getApps)`; exposes `mutate`/`revalidate` so
  views refresh after add/edit/remove/activate.
- `useActiveApp()` — resolves the active `ClerkApp`; returns
  `{ app, isLoading, revalidate }`.
- `usePaginatedClerkList(fetcher)` — wraps `usePromise` with offset/limit
  pagination. `fetcher({ query, page })` calls a Clerk list method and returns
  `{ data, hasMore }` computed from `totalCount`, `limit`, and `offset`. Search
  text is passed through as `query` (server-side filtering), debounced via the
  list's `onSearchTextChange`.

Page size default: 50.

## 9. Authentication & onboarding UX

Goal: open dashboard → copy key → one-tap add.

### 9.1 AuthGuard (`components/auth-guard.tsx`)

Reusable empty-state shown by any data command when there are **no configured
apps** or **no active app**. Renders `List.EmptyView` (or `Detail` for detail
screens) with guidance text and an `ActionPanel` (Raycast's footer/action bar)
whose actions are:

1. **Open Clerk Dashboard → API Keys** (`Action.OpenInBrowser`, `DASHBOARD_API_KEYS_URL`).
2. **Add App from Clipboard** (primary when clipboard holds a key, see 9.3).
3. **Add App Manually…** (pushes `app-form`).

This is the "clickable link in the footer of other commands when not
authenticated" requirement.

### 9.2 Manage Apps (`manage-apps.tsx`)

`List` of configured apps. The active app is flagged with an accessory (e.g.
checkmark + "Active" tag) and each item shows its instance type. Actions:
- **Add App from Clipboard** / **Add App Manually…** / **Open Clerk Dashboard → API Keys**
- **Set as Active**
- **Edit** (pushes `app-form` prefilled)
- **Remove** (`confirmAlert`, destructive)

Empty state delegates to AuthGuard's actions.

### 9.3 Add from clipboard (zero typing)

`Clipboard.readText()`; if `isClerkSecretKey` matches, validate against the API
(see 9.5) and on success persist a `ClerkApp` with an auto-generated name
(`instanceType · last4`). Becomes active if it is the first app. Success toast.
If the clipboard does not hold a key, the action is hidden/disabled and the user
uses the manual form.

### 9.4 Add/Edit form (`components/app-form.tsx`)

- `Form.TextField` **name**, `Form.PasswordField` **secret key**.
- **On mount**, reads the clipboard; if a Clerk key is present it prefills the
  secret-key field and defaults the name from the detected instance type, with a
  `Form.Description` noting "Detected a Clerk key on your clipboard."
- Instance type is detected live from the key prefix and shown.
- Actions: **Save**, **Open Clerk Dashboard → API Keys**, and **Paste Secret Key
  from Clipboard** (re-reads the clipboard to fill the field — covers opening the
  dashboard *after* the form is already on screen).
- Used for both add and edit (edit passes an existing `ClerkApp`).

### 9.5 Key validation

Before persisting (clipboard or form), build the client and call
`users.getUserList({ limit: 1 })`. Success → persist. Failure → surface a
normalized error (9, errors) and do not persist.

### 9.6 Switch Active App (`switch-app.tsx`)

`List` of configured apps; the active one is flagged. Enter sets active and
`showHUD("Switched to <name>")`. Empty → AuthGuard.

## 10. Data commands & flows

All list commands: `usePaginatedClerkList`, server-side search via `query`,
`useCachedPromise` semantics for cached reads, and `mutate`-based refresh after
mutations.

### 10.1 Search Users (`search-users.tsx`)

- Fetch: `clerkClient.users.getUserList({ query, limit, offset })` → `{ data, totalCount }`.
- `List.Item`: avatar from `imageUrl`; title = full name or primary email;
  subtitle = primary email/username; accessories = banned badge (if banned) +
  last-active/last-sign-in date.
- Actions:
  - **View Details** → `user-detail`
  - **View Organizations** → `user-orgs`
    (`users.getOrganizationMembershipList({ userId })`)
  - **Ban** / **Unban** (`users.banUser` / `users.unbanUser`)
  - **Revoke All Sessions** — `sessions.getSessionList({ userId, status: "active" })`
    then `sessions.revokeSession(id)` for each
  - **Delete User** (`users.deleteUser`, destructive, `confirmAlert`)
  - **Copy User ID** / **Copy Email**

### 10.2 User Detail (`components/user-detail.tsx`)

`Detail` with `Detail.Metadata`: id, email addresses, username, created, last
sign-in, banned status, 2FA enabled, and formatted public/private/unsafe
metadata. Markdown body shows name + avatar. Actions mirror the list, plus
**View Sessions** (`sessions.getSessionList({ userId })`) rendered as a pushed
list (session id, status, last active, expiry; action to revoke a single
session).

### 10.3 User's Organizations (`components/user-orgs.tsx`)

`List` from `users.getOrganizationMembershipList({ userId })`. Item: org name +
role accessory. Enter → `org-members` for that org.

### 10.4 Search Organizations (`search-organizations.tsx`)

- Fetch: `clerkClient.organizations.getOrganizationList({ query, limit, offset })`.
- `List.Item`: org `imageUrl`; title = name; subtitle = slug; accessories =
  members count + created date.
- Actions:
  - **View Members** → `org-members`
  - **Create Organization** — pushes a form (`name`, `slug` optional,
    **`createdBy` (user ID, required by the API)**); calls
    `organizations.createOrganization({ name, slug, createdBy })`
  - **Delete Organization** (`organizations.deleteOrganization`, destructive)
  - **Copy Org ID** / **Copy Slug**

### 10.5 Org Members (`components/org-members.tsx`)

- Fetch: `organizations.getOrganizationMembershipList({ organizationId, query, limit, offset })`.
- `List.Item`: title = member name/email; accessory = role badge.
- Actions:
  - **View User Details** → `user-detail` (the member's user)
  - **Change Role** — `updateOrganizationMembership({ organizationId, userId, role })`;
    role chosen from a dropdown of `org:admin` / `org:member` plus a free-text
    entry for custom roles
  - **Remove Member** (`deleteOrganizationMembership`, destructive, `confirmAlert`)

## 11. Error handling (`lib/errors.ts`)

`showClerkError(error)` normalizes failures:
- `ClerkAPIResponseError` (carries `.errors[].message` and HTTP status):
  - 401 / 403 → toast "Secret key was rejected — check this app in Manage Apps"
    with an action that opens Manage Apps.
  - 429 → rate-limit notice with a retry hint.
  - Other → first `.errors[].message`.
- Non-Clerk / network errors → generic `showFailureToast` from `@raycast/utils`.

Empty results render an `EmptyView` ("No users found" / "No organizations found").
Destructive mutations are gated by `confirmAlert`; every mutation shows a
success/failure toast and refreshes the list via `mutate`.

## 12. Testing

Raycast has no built-in UI test runner; the norm is `ray lint` + manual
`ray develop`. Strategy:

- **Unit tests (vitest), TDD'd:** the pure, isolatable logic —
  `isClerkSecretKey`, `instanceTypeFromKey`, default-name generation, pagination
  offset/`hasMore` math, storage (de)serialization, and error mapping.
- **Manual verification checklist** (run via `ray develop`) for the UI commands:
  add-from-clipboard happy path, manual form prefill, validation failure, switch
  app, search + paginate users/orgs, drill into members, each mutation with
  confirm + refresh, and the unauthenticated empty-state/footer link in every
  data command.

vitest is added as a devDependency with a `test` script.

## 13. Out of scope (v1)

- Enumerating Clerk applications automatically / private Dashboard API.
- Dashboard-only instance settings (auth providers, themes, email templates).
- Editing user/org metadata (read-only display in v1).
- Webhooks, JWT templates, M2M tokens, billing.

## 14. Open items / notes

- README must document the LocalStorage-at-rest tradeoff for secret keys.
- `createOrganization` requires a `createdBy` user ID; the create form surfaces
  this explicitly.
- Custom org roles beyond `org:admin` / `org:member` are supported via free-text
  in the Change Role action (no list-roles call in v1).

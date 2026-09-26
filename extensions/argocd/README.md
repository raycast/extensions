# 🐙 ArgoCD for Raycast

Search applications across several ArgoCD instances, then open, inspect or sync the one you
found. Built for instances holding thousands of applications behind a VPN.

📖 **How it works and why:** [`openwiki/quickstart.md`](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/quickstart.md). This file is
the usage reference.

## 🔍 Commands

| Command                | Mode             | What it does                                                              |
| ---------------------- | ---------------- | ------------------------------------------------------------------------- |
| Search Applications    | view             | Every instance at once, or one. Paints from cache, refreshes behind you.  |
| Search ApplicationSets | view             | ApplicationSets with a rollup of what each generated, and a jump to them. |
| Manage Instances       | view             | Add and edit instances, see reachability, handle logins and tokens.       |
| Monitor                | menu bar, 10 min | Counts what is degraded or out of sync. Also keeps the cache warm.        |

## 🚀 Install

Search **ArgoCD** in the Raycast Store, or install it from
[raycast.com](https://www.raycast.com/pixibixi/argocd).

To run it from source instead, see [Run it locally](#-run-it-locally).

## 🛠️ Run it locally

Raycast on macOS, Node 22.22.2 or later. The `argocd` CLI only for the CLI session mode.

```sh
npm install
npm run dev
```

The four commands appear at the top of Raycast's root search. Reopen a command to pick up a
code change.

Keep `npm run dev` running. `ray develop` holds the compiled commands in memory and Raycast
fetches them from it, so stopping the dev server leaves the commands listed but not runnable:
opening one then reports **"Missing executable. You might need to build the extension."**
`npm run build` does not fix that, it compiles and keeps nothing. Start `npm run dev` again.

## ⚙️ Adding an instance

**Manage Instances** → add → fill in:

| Field                  | Notes                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| Name                   | How it is labelled in results, for example `prod-tooling`.               |
| Server URL             | Base URL of the ArgoCD web UI. `https` only.                             |
| Environment            | `prod`, `preprod` or `dev`. Drives the badge colour and the write guard. |
| Authentication         | See below.                                                               |
| Allow write operations | Off by default. Forced off on `prod`, where it cannot be turned on.      |
| Include in searches    | Off keeps it configured without querying it.                             |

Stored in Raycast's local storage. Nothing leaves the Mac, and no hostname is committed here.

## 🔐 Authentication

Three modes, and they are not equivalent. Two keep your own identity and your own RBAC; the
third does not.

| Mode                  | Identity                           | Renews itself     | Setup                                                     |
| --------------------- | ---------------------------------- | ----------------- | --------------------------------------------------------- |
| 🥇 Single sign-on     | **Yours**                          | **Yes**, silently | One browser login, from the extension                     |
| 🥇 argocd CLI session | **Yours**, via the CLI's session   | **Yes**, silently | `argocd login <host> --sso --grpc-web`, once per instance |
| ⚠️ API token          | The token's account, **not yours** | No                | **Set API token**                                         |

The first two are equally good and both need the loopback redirect URI registered on the OIDC
client. Pick the CLI session to keep one credential store that the `argocd` CLI, this extension
and any other ArgoCD tool all read; pick single sign-on to configure nothing outside Raycast.

The CLI session mode reads the refresh token `argocd login --sso` stores alongside the bearer,
so it renews itself too. A bearer with no readable expiry, such as an API token written into the
config by hand, is left alone and never renewed.

Read [`openwiki/domain/authentication.md`](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/domain/authentication.md) before choosing
the third.

### Single sign-on setup

It needs a **public** OIDC client, because ArgoCD's web client is confidential and a token
exchange on it without a secret is refused. Once, with whoever administers your identity
provider:

1. Create a public OIDC client: no secret, PKCE required, token endpoint auth method `none`,
   grants `authorization_code` and `refresh_token`, redirect URI
   `http://localhost:8085/auth/callback`, assigned to the same group as the ArgoCD app.
2. Set `oidc.cliClientID: <the new client id>` in `argocd-cm`, on each instance.

That URI is the one the official ArgoCD CLI uses on its default port, so registering it also
makes `argocd login --sso` work for everyone. Full reasoning:
[`openwiki/domain/authentication.md`](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/domain/authentication.md#what-it-needs-once).

Then use **Log in with single sign-on**. The browser opens once, and that is the last time you
are asked. If the client is not public, the extension says so and names `oidc.cliClientID` as
the fix.

### ⚠️ API token, only where single sign-on cannot run

An ArgoCD account token carries **the account's permissions, not yours**. That means your
requests stop being attributable in the audit log, and the token can grant more access than
your own account has. It is a personal workaround, not a way to onboard a team, and creating one
needs `accounts, update`, which usually means an administrator.

If you still need it:

```sh
argocd account generate-token --account <account-with-apiKey> --server argocd.example.com --grpc-web
```

Without `--expires-in` it never expires. That command needs a session itself, so bootstrap it
from the web UI: copy the `argocd.token` cookie and pass it as `--auth-token`. ⚠️ Generating a
token **writes** to `argocd-secret`, so do not run it against an instance you may only read.

Give each machine its own token id, `raycast-<hostname>` rather than `raycast`: a token's value
cannot be read back, so replacing one invalidates it, and a shared id means configuring a second
machine silently breaks the first.

Set the instance's mode to `API token`, then **Set API token**. It goes into Raycast's own
encrypted storage, which only this extension can read, and the write is verified by reading it
back before success is reported. **Clear API token** removes it.

## 🎛️ Preferences

| Preference                 | Default  | Range       |
| -------------------------- | -------- | ----------- |
| Cache TTL                  | `60`     | 5 to 3600 s |
| Request Timeout            | `15`     | 3 to 120 s  |
| Reachability Probe Timeout | `4`      | 1 to 30 s   |
| Max Results                | `60`     | 10 to 200   |
| argocd CLI Path            | `argocd` |             |

A value that does not parse falls back to the default; out of range is clamped.

`Monitor` adds **When everything is healthy**, off by default, so the menu bar stays
quiet until something needs attention.

## ⌨️ Application actions

| Action                               | Shortcut          | Notes                                                                                            |
| ------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------ |
| Show details                         | `↵`               | Leads with the resources needing attention, then the deployed commit and the recent deployments. |
| Show resources                       | `⌘O`              | Every managed object with sync, health, sync wave, hook and prune flags. Costs no request.       |
| Show diff                            | `⌘D`              | What is out of sync. Offered when the application is out of sync.                                |
| Show sync status                     | `⌘Y`              | Follows a running sync until it finishes.                                                        |
| Refresh                              | `⌘R` / `⌘⇧R`      | Normal, or hard. A read, so it works on read-only instances.                                     |
| Sync with options                    |                   | 🔒 Only where write operations are allowed.                                                      |
| Quick sync                           |                   | 🔒 Default options, behind a confirmation.                                                       |
| Show sibling applications            |                   | The others the same ApplicationSet generated.                                                    |
| Open in ArgoCD                       |                   | The application, or one selected resource from the resources view.                               |
| Copy name, copy URL, open repository | `⌘⇧C` for the URL |                                                                                                  |

From the resources view each resource also offers its own diff, a deep link, and **Copy kubectl
command**. The detail view shows the sync policy as tags: `automated`, `prune`, `self-heal`, or
`manual`.

## 🔄 Sync options

An untouched form sends an empty body, meaning "sync with the application's own settings". The
form shows in one line what it will send, and everything but a dry run asks for confirmation
naming the application, the instance and its environment.

| Control                | Request field                                     |
| ---------------------- | ------------------------------------------------- |
| Revision               | `revision`                                        |
| Prune                  | `prune`                                           |
| Dry run                | `dryRun`                                          |
| Apply only, skip hooks | `strategy.apply`                                  |
| Force                  | `strategy.apply.force` or `strategy.hook.force`   |
| Replace                | `syncOptions += Replace=true`                     |
| Server-side apply      | `syncOptions += ServerSideApply=true`             |
| Prune last             | `syncOptions += PruneLast=true`                   |
| Skip schema validation | `syncOptions += Validate=false`                   |
| Retry, retry limit     | `retryStrategy`, backoff 5s doubling capped at 3m |

🔒 On a `prod` instance these actions do not exist, and the client refuses a write independently
of the UI. See
[`openwiki/architecture/commands.md`](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/architecture/commands.md#the-write-guards).

## 📊 Menu bar

Run **Monitor** once and the icon installs itself next to the clock. Nothing happens
inside Raycast, which is expected. If it does not appear, a full macOS menu bar is usually
dropping it silently.

| Title              | Meaning                                                           |
| ------------------ | ----------------------------------------------------------------- |
| 🐙 icon alone      | everything healthy and synced                                     |
| `2 degraded`       | leads with the most urgent count; the breakdown is in the tooltip |
| `3 missing`        | nothing degraded                                                  |
| `5 out of sync`    | nothing degraded or missing                                       |
| `prod unreachable` | shown only once nothing else is known to be wrong                 |

## 📡 Reachability

Every instance is probed before it is queried, so a disconnected VPN is reported in under a
second and lists still render from cache. `⌘T` re-probes; the result is cached for 30 seconds.

| Dot | Means                                                                                          |
| --- | ---------------------------------------------------------------------------------------------- |
| 🟢  | answered 2xx, with the server version and the round-trip time                                  |
| 🟠  | answered, but not 2xx or without a version. Wrong URL, a proxy in the way, or a broken server. |
| 🔴  | nothing answered. Check your VPN.                                                              |
| ⚪  | not probed yet                                                                                 |

## 🩺 Troubleshooting

| Symptom                                  | Fix                                                                                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "There is no single sign-on session yet" | **Log in with single sign-on**. If it fails naming `oidc.cliClientID`, the provider client is not public yet.                                                                                                   |
| "No argocd CLI session for \<host\>"     | `argocd login <host> --sso --grpc-web`. A config listing only `kubernetes` or `localhost:8080` has no session for the host. `gcloud` and `kubectl` are unrelated: they authenticate to the cluster, not ArgoCD. |
| "No API token stored"                    | **Set API token**. An empty or missing value counts as no token, and a store is verified by reading it back.                                                                                                    |
| 🔴 "unreachable, check your VPN"         | Connect the VPN, then `⌘T` in Manage Instances or `⌘⇧R` in the search command.                                                                                                                                  |
| 🟠 amber dot with a status               | The instance answered something other than 2xx on `/api/version`. Usually the URL points at something that is not an ArgoCD.                                                                                    |
| "cached 12 min ago, refresh failed"      | The cached list is shown on purpose. The reason is in the section subtitle; `⌘R` retries that instance alone.                                                                                                   |
| Search ApplicationSets is empty          | Open Search Applications once so the reconstruction has a cache. [Why](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/domain/argocd-api.md#applicationsets-are-filtered-silently).               |
| The sync action is missing               | Write operations are off, or it is a `prod` instance where they cannot be turned on.                                                                                                                            |
| Results are truncated                    | The list renders at most `Max Results` rows. Narrow the search.                                                                                                                                                 |

## 🧰 Development

```sh
npm test && npm run typecheck && npm run lint && npm run build && ./scripts/check-no-secrets.sh
```

All five are required before a commit. What each catches, the optional real-instance test, and
the repository conventions: [`openwiki/development.md`](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/development.md).

## 📚 Documentation

|                                                                                                                          |                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 🧭 [Quickstart](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/quickstart.md)                             | What this is, the four constraints that shaped it, where to go next |
| 🏗️ [Layering](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/architecture/layering.md)                    | The `lib`/`ui` boundary and why 485 tests need no Raycast runtime   |
| ⚡ [Read path](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/architecture/read-path.md)                  | The 100 MB heap limit, streaming, the cache, capped rendering       |
| 🧩 [Commands](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/architecture/commands.md)                    | The four commands, their views, the three write guards              |
| ⚠️ [What the ArgoCD API does not do](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/domain/argocd-api.md) | Four things it appears to do and does not. Read this first.         |
| 🔐 [Authentication](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/domain/authentication.md)              | The three modes, the provider findings, where credentials live      |
| 🧰 [Development](https://github.com/PixiBixi/raycast-argocd/blob/main/openwiki/development.md)                           | The gate, the leak gate, the CI, the conventions                    |

## 📄 Licence

MIT. See [`LICENSE`](LICENSE).

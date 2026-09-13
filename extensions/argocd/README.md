# ArgoCD

Search and browse your ArgoCD applications and projects without leaving Raycast — check sync/health status, browse resources, view manifests, tail pod logs, and log in via SSO.

## Requirements

- Access to an ArgoCD server (Web UI + API reachable from your machine).
- The [`argocd` CLI](https://argo-cd.readthedocs.io/en/stable/cli_installation/) installed locally (e.g. `brew install argocd`) — only needed if you're **not** using an API Token (see below). It powers the **Login** command and, by default, is where the extension reads your auth token from.

## Setup

Open the extension preferences and set:

- **Server URL** (required) — your ArgoCD server, e.g. `https://argocd.example.com`.
- **API Token** (optional) — an ArgoCD auth token to use directly. If left blank, the token is read from your local `argocd` CLI config instead.
- **argocd Config Path** (optional) — path to the `argocd` CLI config file. Defaults to `~/.config/argocd/config`.

If you don't set an API Token, authenticate the CLI once before using the extension:

- Run the **Login** command (runs `argocd login <server> --sso` for you), or
- Run `argocd login <server> --sso` yourself in a terminal.

The extension then reads the resulting auth token from the CLI config for the context matching your Server URL. If the token expires or is rejected, just log in again.

## Commands

- **Search Applications** — search applications by name, view sync/health status, browse resources, view manifests and pod logs, and open items in ArgoCD.
- **Search Projects** — search projects by name and drill into their applications.
- **Login** — authenticate the `argocd` CLI against your server via SSO.

Star an application or project (⌘F) to pin it to the top of its list under a **Favorites** section.

## Deep-linking to a specific application

Search Applications takes an optional `appName` argument that jumps straight to that application's Details screen, skipping the list entirely. From Details, Browse Resources (⌘G), View Manifest (⌘M), and View Rollout History (⌘H) are one keystroke away. Create a Raycast Quicklink (or any URL-scheme launcher) pointing at:

```
raycast://extensions/erecarte-twilio/argocd/search-applications?arguments=%7B%22appName%22%3A%22your-app-name%22%7D
```

That's `?arguments={"appName":"your-app-name"}` URL-encoded. Bind it to a hotkey for one-keystroke access to an app you check often.

Use the **Copy Deeplink** action on any application row (or on its Details screen) to copy that URL without building it by hand.

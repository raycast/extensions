# ProxyManager control protocol (v1)

The canonical reference for the wire format this extension speaks. It mirrors
`Sources/Integration/` in the
[ProxyManager repository](https://github.com/chaim-chv/proxy-manager); if the two
disagree, the Swift source wins and this file is out of date.

## Where it lives

| Thing | Path |
|---|---|
| Socket | `~/Library/Application Support/ProxyManager/control.sock` (mode `0600`) |
| Token | `~/Library/Application Support/ProxyManager/control.token` (mode `0600`) |
| Audit log | `~/Library/Application Support/ProxyManager/integration-audit.jsonl` |
| Consent store | `~/Library/Application Support/ProxyManager/integration-permissions.json` |

Both files exist only while ProxyManager is running **and** Settings →
Integration → *Allow external control* is on. The token is regenerated on every
launch, so always read it again; never cache it across calls.

## Framing

One request per connection:

```
+----------------+------------------------------+
| uint32 BE len  | len bytes of UTF-8 JSON      |
+----------------+------------------------------+
```

- Maximum frame: `256 KiB` in both directions.
- Request read timeout: 5 s. Reply timeout: 25 s (the consent sheet can block).
- The app closes the connection after one reply.
- A connection from a different UID is dropped before a byte is read.

## Request envelope

```json
{
  "v": 1,
  "token": "<64 hex chars from control.token>",
  "identity": {
    "pid": 4711,
    "bundleID": "com.raycast.macos",
    "teamID": null,
    "requirement": "com.proxymanager.raycast-extension",
    "displayName": "Raycast",
    "path": "/Applications/Raycast.app"
  },
  "request": {
    "v": 1,
    "id": "<uuid>",
    "action": "targets.add",
    "args": { "pattern": "api.example.com", "enabled": true }
  }
}
```

`identity.requirement` is a **stable consent key**, not a proof. The real gate is
the UID check plus the token. The app hashes the requirement into a permission
key, so changing it makes the app ask for consent again.

Over XPC the agent fills in `token` and `identity` from the caller's audit token;
over the socket the client supplies both. This extension uses the socket only —
the XPC agent needs a Developer-ID-signed ProxyManager and a sandbox exception
Raycast does not ship.

## Response envelope

```json
{
  "v": 1,
  "result": {
    "v": 1,
    "id": "<same id>",
    "action": "targets.add",
    "ok": true,
    "changed": true,
    "data": { "id": "…", "pattern": "api.example.com" },
    "error": null,
    "auditId": "…",
    "durationMs": 4
  }
}
```

`ok: false` carries `error: { code, message, field? }`. Error codes:
`bad_request`, `unknown_action`, `invalid_argument`, `unauthorized`, `forbidden`,
`not_found`, `conflict`, `busy`, `timeout`, `unavailable`, `unsupported`,
`shutting_down`, `requires_user_action`, `internal`.

`changed` is `false` when a mutation was already in the requested state; treat it
as success, not as a no-op error.

## Authorization

| Scope | Reach |
|---|---|
| `read` | every `*.list`, `status`, `routing.explain`, `apps.resolve`, `ui.open`, `app.activate` |
| `control` | `read` + `routing.*`, `targets.*`, `presets.apply`, `apps.*` mutations |

- The first request from an unknown identity shows a sheet in ProxyManager:
  **Allow Control / Read Only / Deny**. It blocks the reply, sometimes for a
  while, which is why policy calls get a 30 s client timeout.
- Rate limits per caller: 240 reads/min, 30 mutations/min, and 6/min for
  `routing.toggle` (each one runs `networksetup`).
- No action accepts a secret, and none of them can raise an admin prompt.

## Actions

| Action | Arguments | Risk |
|---|---|---|
| `ping` | — | read |
| `capabilities` | — | read |
| `status` | — | read |
| `routing.explain` | `host`, `bundleID?` | read |
| `routing.enable` / `routing.disable` | — | policy |
| `routing.toggle` | — | policy |
| `routing.retry` | — | policy |
| `targets.list` | `enabledOnly?` | read |
| `targets.add` | `pattern`, `enabled?` | policy |
| `targets.remove` | `id` **or** `pattern` | policy |
| `targets.update` | `id`, `pattern?`, `enabled?` | policy |
| `targets.clear` | `confirm=true` | policy |
| `presets.list` | — | read |
| `presets.apply` | `name` (or preset id) | policy |
| `apps.list` | — | read |
| `apps.setEnabled` | `enabled` | policy |
| `apps.setDefault` | `mode` = `TUNNEL` \| `TARGETS` \| `DIRECT` | policy |
| `apps.rule.set` | `key`, `keyKind`, `mode`, `enabled?` | policy |
| `apps.rule.remove` | `id` **or** `key` + `keyKind` | policy |
| `apps.resolve` | `bundleID` \| `path` \| `pid` | read |
| `ui.open` | `pane`, `section?`, `revealPattern?`, `revealAppRuleID?` | ui |
| `app.activate` | `pane?` | ui |

`keyKind` is `BUNDLE`, `EXECUTABLE` or `EXECUTABLE_NAME`. `pane` is `dashboard`,
`settings`, `onboarding` or `about`; `ui.open` with `section` requires
`pane=settings`.

Unknown arguments are rejected, so a typo fails loudly instead of silently doing
the wrong thing.

## Payloads

### `status`

```json
{
  "state": "on",                  // off | starting | on | degraded | stopping
  "routingIntended": true,        // the user's intent, survives a degraded state
  "tunnelUp": true,
  "bindHost": "127.0.0.1",
  "port": 8888,
  "lastError": null,
  "onboardingComplete": true,
  "authorizationDeferred": false,
  "targetsCount": 12,
  "appRulesCount": 1,
  "appVersion": "1.0.0",
  "protocolVersion": 1
}
```

`state: "degraded"` means the listener is up but the SOCKS5 tunnel is not
reachable. `authorizationDeferred` means the system proxy could not be applied
without an admin approval.

### `targets.list`

```json
{ "targets": [ { "id": "<uuid>", "pattern": "*.example.com", "enabled": true } ], "count": 1 }
```

### `presets.list`

```json
{ "presets": [ { "id": "deepseek", "name": "DeepSeek", "summary": "…", "count": 3 } ] }
```

`presets.apply` merges the preset's rules into the target list and returns
`{ "added": n }`.

### `apps.list`

```json
{
  "enabled": true,
  "defaultMode": "TARGETS",
  "recordInTelemetry": true,
  "rules": [
    { "id": "<uuid>", "key": "com.tinyspeck.slackmacgap",
      "keyKind": "BUNDLE", "mode": "TUNNEL", "enabled": true }
  ]
}
```

### `routing.explain`

```json
{
  "host": "api.example.com",
  "decision": "tunnel",          // tunnel | direct
  "matchedPattern": "*.example.com",
  "matchedTargetID": "<uuid>",
  "appMode": "TARGETS",          // null when per-app routing is off
  "appRuleKey": null
}
```

Without a `bundleID`, `appMode` is the **default** mode for unlisted apps, not
the mode of the app that made the request. Pass the frontmost app's bundle ID
when the answer should reflect the app the user is in.

### `apps.resolve`

```json
{
  "bundleID": "com.tinyspeck.slackmacgap",
  "path": "/Applications/Slack.app/Contents/MacOS/Slack",
  "displayName": "Slack",
  "mode": "TARGETS",             // TUNNEL | TARGETS | DIRECT
  "ruleID": null
}
```

- `mode` is the rule's mode when a rule matches, otherwise the default mode for
  unlisted apps — and `TARGETS` when per-app routing is off.
- Only rules with `keyKind: "BUNDLE"` are considered here (and in
  `routing.explain`). A rule keyed by executable path or name still affects
  traffic, but it is invisible to these two reads, so create app rules as
  `BUNDLE` when you want them discoverable.
- `apps.rule.set` upserts by `key` + `keyKind`; it never turns per-app routing on
  as a side effect. Call `apps.setEnabled` first if rules should start applying.

## Target pattern rules

Mirrored client-side in `src/lib/host.ts` so the form fails before a round trip:

- lowercased, port stripped, trailing dots removed, max 253 characters;
- one optional leading `*.`; `*` alone, `api.*.com`, `example.*` are rejected;
- letters, digits, `.`, `-`, `_`, `:` and `*` only — no scheme, path or spaces;
- 500 rules maximum (`conflict` when full);
- `targets.add` is idempotent: adding an existing pattern with a different
  `enabled` flips it and reports `changed: true`.

## Debugging

```bash
log stream --predicate 'subsystem == "com.proxymanager.app" AND category == "integration"'
tail -f ~/Library/Application\ Support/ProxyManager/integration-audit.jsonl
```

The audit log records caller, action, redacted arguments, outcome and duration
for every request when *Keep an audit log* is on.

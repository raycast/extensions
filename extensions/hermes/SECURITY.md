# Security Policy

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private reporting instead: the **Security** tab of this repository → **Report a
vulnerability**. That opens a private advisory visible only to the maintainer and to you.

Please include what you would want to receive: what an attacker can do, the steps to reproduce it,
and the versions involved (extension commit, Raycast, Hermes Agent, operating system). If a proof of concept
touches a real Hermes install, describe it — do not attach anything containing your own key or
conversation contents.

Expect a first reply within a few days. This is a one-person project, so there is no formal SLA and
no bug bounty.

## Supported versions

Pre-1.0 and not yet published on the Raycast Store. Only the latest commit on the default branch is
supported. Fixes land there; there are no backports.

## What this extension actually handles

Useful context for judging whether something is a vulnerability here:

- **The extension talks only to `127.0.0.1`** — the Hermes API Server on the same machine. There is
  no remote mode and no external endpoint. Any code path that would send data off the machine is a
  bug, and a report-worthy one.
- **That is enforced, not just promised.** The `Hermes Address` preference accepts loopback only
  (`127.0.0.0/8`, `::1`, `localhost`); the port is free, the host is not. Anything else is refused
  in `checkBaseUrl()` and the discovery stops with an error on screen instead of connecting — a
  request would have carried the key in the `Authorization` header. A way around that check is a
  vulnerability.
- **The Hermes key (`API_SERVER_KEY`) is a local secret.** It is stored in Raycast's secure
  storage, sent only as an `Authorization: Bearer` header to `127.0.0.1`, and redacted everywhere
  it could otherwise surface: screens, toasts, error messages and the "technical details" payload
  users copy when asking for help. A path that leaks it in cleartext is a vulnerability.
- **The key is read from your Hermes install only after you ask for it.** Auto-detection finds the
  *port* on its own; reading the key from the Hermes `.env` requires an explicit action from the
  user. Silent secret reading would be a bug.
- **Copied and selected text is untrusted input.** The clipboard commands pass content the user did
  not write to an agent that can run tools. `src/lib/input-safety.ts` exists for that reason —
  size limits and protection against instructions embedded in copied text. Bypasses of that layer
  are in scope.
- **Approvals are a security boundary.** When Hermes asks for permission to do something, the
  extension must show what is being approved and must not approve on the user's behalf. Anything
  that auto-approves, mislabels, or lets an approval land on the wrong run is in scope.

## Out of scope

- Vulnerabilities in Hermes Agent itself, in Raycast, or in Node.js — report those upstream.
- Anything that requires an attacker to already have code execution on the user's machine as that
  user. At that point the local Hermes key is already theirs, with or without this extension.

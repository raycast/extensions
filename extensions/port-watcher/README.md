# Port Watcher

A Raycast extension that answers one question in one list: **what is running on
localhost right now, and how do I start or stop it?**

The list combines two things:

1. **What is actually listening** — read live from the system (`lsof`). Every
   local TCP listener shows up, whether you declared it or not, enriched with
   its working directory, full command line, and what the project is built with.
2. **Profiles you declared** — a folder, a run command, and optionally a port.
   Each profile is launchable and killable from the same list, with a green/grey
   dot telling you at a glance whether it is up.

## The profile concept

A profile is deliberately small:

- **Folder** — the identity of the profile. Matching between a profile and a
  running process is exact on the working directory, never by prefix.
- **Run command** — one shell line, run through your login shell (so your PATH,
  nvm, brew setup all apply). A build step is written inline:
  `npm run build && npm run dev`.
- **Port** *(optional)* — does exactly one job: telling apart two profiles that
  share a folder (dev + storybook in one repo). It is not the identity and not
  the URL; the live port is read from the system.

## Features

- Live list of local TCP listeners, with system daemons hidden by default
  (switchable — and the list always says how many rows it is hiding).
- Launch a profile and get an honest answer: **listening** (with the real
  port), **exited** (with the exit code and the last log line), or **still
  working** — never a guess.
- Kill any listener with SIGTERM; if it refuses to die you are offered SIGKILL,
  never surprised by it.
- Capture a profile from something already running: folder and port are read
  from the system, the run command is inferred from the npm script that
  produced the process — and you confirm it in a form, nothing is saved behind
  your back.
- Run-command suggestions read from evidence on disk (lockfiles, package.json
  scripts, manage.py, Cargo.toml, Makefile targets, index.html), never guessed.
- "Built with" tags read the declared dependencies (Next.js, Vite, Django…).
- A `LAN` tag flags servers bound to every interface — reachable from your
  network, not just this machine.
- Per-profile launch logs (⌘L), separated per run.

## Install

This extension is not on the Raycast Store; it runs as a local development
extension:

```sh
npm install
npm run dev     # ray develop — loads the extension into Raycast
```

`npm run build` (ray build) produces a standalone build.

## Where things live

- Profiles: `~/.config/port-watcher/profiles.json` — outside Raycast's storage
  so they survive uninstall/reinstall. You never need to edit it by hand; the
  form is the interface.
- Launch logs: `~/.config/port-watcher/logs/<profile-id>.log`.

## Non-goals

- General macOS apps (Activity Monitor covers them).
- Anything that is not a localhost server.
- Guessing how to restart a process that is not declared: undeclared listeners
  are read/kill only.
- Identifying the project behind a container: container runtimes are recognized
  and never hidden, but what runs inside them is not visible from the host.

## Development

```sh
npm test            # vitest — unit tests on the plain-Node modules
npx tsc --noEmit    # type check
npm run lint        # ray lint
```

Only `src/list-servers.tsx` imports `@raycast/api`; everything else
(`system.ts`, `profiles.ts`, `matching.ts`, `launch.ts`) is plain Node and
tested without the app.

The icon is generated from `icon.svg` (kept at the root rather than in
`assets/`, which only holds what the extension loads at runtime):

```sh
rsvg-convert -w 512 -h 512 icon.svg -o assets/extension-icon.png
```

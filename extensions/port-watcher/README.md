# Port Watcher

See what is listening on localhost right now, kill it, or launch the dev servers
you declared — all from one list.

The list combines two things. **What is actually running**, read live from your
machine: every local TCP listener shows up, whether you declared it or not, with
its folder, its command, and what the project is built with. And **the profiles
you declare**, launchable and killable from that same list, with a green dot when
they are up.

## Profiles, in one minute

A profile is three fields, and only the first two are required.

- **Folder** — this is the identity of a profile. A profile is matched to a
  running server by its folder, so a dev server that found 5173 busy and moved to
  5174 is still recognized as yours.
- **Run command** — one shell line (`npm run dev`), run through your login shell,
  so your PATH behaves exactly as it does in a terminal. A build step is written
  inline: `npm run build && npm run dev`.
- **Port** *(optional)* — it does exactly one job: telling apart two profiles
  that share a folder, like a dev server and a Storybook in the same repo. It is
  not the address you open — the live port is always read from the system.

You rarely type any of it. Select a server that is already running and **Create
Profile from This**: the folder is read from the system, and the run command is
inferred from the npm script behind the process. The form opens for you to check
it — nothing is ever saved without you.

## What it tells you — and what it won't

Launching answers with what was observed, never with a guess: **listening**, with
the real port; **exited**, with the exit code and the last line of the output
(⌘L for the whole log); or **still working**, because a slow build is not a
failure.

A `LAN` tag marks servers bound to every interface — reachable from your network,
not just from this machine. System daemons are hidden by default, and the list
always tells you how many it is hiding. Container runtimes are never hidden, but
what runs inside them cannot be seen from the host, and the extension says so
rather than inventing an answer.

Servers you did not declare are read-and-kill only. Killing sends SIGTERM and
waits for the process to actually stop; if it ignores the signal, you are offered
SIGKILL — never surprised by it.

## Your data

Profiles live in `~/.config/port-watcher/profiles.json`, outside Raycast's own
storage, so they survive an uninstall and a reinstall. Launch logs sit beside
them in `logs/`. You never need to open either one: the form is the interface.

## Not in scope

General macOS apps — Activity Monitor already covers those. Anything that is not
a localhost server. And guessing how to restart a process you never declared.

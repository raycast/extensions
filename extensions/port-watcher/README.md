# Port Watcher

One list, two halves: what is listening on localhost right now, read live from
your machine — and the dev servers you declared, launchable and killable from
the same place.

## Reading the list

Everything listening shows up, not just your profiles. Your servers are named by
the folder they run from; the rest keep their port. Each one's details say who
started it — so a server an agent spun up tells you so, instead of hiding among
yours. System daemons are tucked behind a scope switch, and a server reachable
from your whole network, not just this machine, is flagged.

Launching answers with what happened, never a guess: it came up — and offers to
open it — or it exited, with the reason, or it is still working, and it keeps
watching until one of those is true.

## Profiles

A profile is a **folder**, a **run command**, and optionally a **port**.

- The **folder** is the identity. A profile is matched to a running server by the
  folder it runs in, so a dev server that found 5173 busy and moved to 5174 is
  still recognized as yours.
- The **run command** is one shell line, run through your login shell — so `npm`
  and friends behave exactly as they do in a terminal. Need a build first? Write
  it inline: `npm run build && npm run dev`.
- The **port** is optional and does one job: telling apart two profiles that
  share a folder, like a dev server and a Storybook in the same repo. It is not
  the address you open — the live port is always read from the system.

You rarely type any of this. Pick a server that is already running, hit **Create
Profile from This**, and the form opens filled in from what is actually on your
machine. Nothing is saved without you.

## Your data

Profiles live in `~/.config/port-watcher/profiles.json`, outside Raycast's own
storage, so they survive an uninstall and a reinstall. Launch logs sit beside
them in `logs/`, one per profile — ⌘L opens the one you are looking at. You never
need to open either by hand: the form is the interface.

## Not in scope

Anything that is not a localhost server, and guessing how to restart a process
you never declared: servers you did not declare are read-and-kill only.

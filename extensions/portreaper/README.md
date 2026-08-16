# Portreaper

Find the orphaned dev-server processes squatting on your ports, and reap them from Raycast.

You kill a terminal, but the `vite` / `node` / `cargo run` it launched keeps running — reparented to the OS, still holding port 3000. Next time you `npm run dev` the port is "already in use" and you have no idea which ghost to kill.

Portreaper is not a generic port viewer. Its job is to **decide which listeners are orphaned dev-server zombies**, so you can act on a verdict instead of a raw process list.

## What you get

- **Every TCP listener**, plus **orphaned dev processes that hold no port at all**. A leftover `electron-vite` main process — adopted by launchd after its parent `node` died, listening on nothing — is invisible to a port scan, but it is exactly the kind of residue worth clearing.
- **A verdict with its evidence.** Suspects are tiered `confirmed` / `likely` / `possible`, and every row shows the signals behind the call: reparented to PID 1, launcher chain ends at a dead shell, dead terminal session, dev-server command line, duplicate instance of the same project.
- **Exemptions applied automatically.** Processes managed by `launchd`, `brew services`, or `pm2`, and anything installed in a standard location, are never flagged.
- **Detail on demand:** launcher chain, uptime, memory, and subtree CPU — a headless browser burns CPU in child processes while its own row reads ~0%, so the subtree total is what tells you it is actually spinning.
- **Star anything to exempt it permanently.** A daemon you detached on purpose is behaviorally identical to an accidental zombie; star it once and it stops being flagged.

## How this differs from a port viewer

The Store already covers the "port 3000 is taken, free it" case — [Port Manager](https://www.raycast.com/diegoleteliers10/ports) is the closest one. If that is your whole problem, a plain port viewer is the simpler tool, and you should use it.

Portreaper answers a different question: **which of these processes is nobody's responsibility?**

- A port viewer lists what is listening and lets you kill it. Deciding what is safe to kill is left to you.
- Portreaper decides first. Every row carries a verdict — `confirmed` / `likely` / `possible` — the evidence behind it, and automatic exemptions for anything `launchd`, `brew services`, or `pm2` is already looking after. A dev server with a live terminal behind it is never flagged.
- It also surfaces orphaned dev processes holding **no port at all**, which a port scan cannot see by definition.
- Killing is guarded rather than immediate: the process creation time is re-checked in the instant before the signal (a recycled PID is refused), and "terminated" is established by re-scanning, not assumed from an exit code.
- The verdict engine is a Rust binary shared with the Portreaper desktop app, so the two frontends agree on the classification and on your stars.

If what you want is a list of ports, this is a heavy way to get one. If what you want is to know which dev servers are ghosts, that is the entire point of it.

## Terminating is safe by construction

The engine captures each process's creation time during the scan and **re-checks it immediately before killing**. If it moved, the kill is refused. That closes the window where a PID gets recycled between the moment you look at the list and the moment you press Enter — killing a recycled PID would mean terminating an unrelated process.

Termination always asks for confirmation first, and **"terminated" means the process is actually gone**: after the signal is delivered, Portreaper re-checks until the process disappears. If it hangs on, you are told so and offered Force Kill, instead of getting a green checkmark over a process that never died.

One case this specifically covers: a dev server **suspended** with Ctrl-Z (or stopped by touching the terminal in the background) never processes a terminate signal — it sits in the pending queue while the OS cheerfully reports success. Portreaper labels those rows `stopped` and wakes the process up so it can shut itself down.

## Shared with the desktop app

Portreaper also ships as a macOS menubar app. Both frontends run the same classification engine and read the same whitelist file, so a star you add here shows up in the desktop app's next scan (within ~2 seconds) and vice versa.

The desktop app is optional — this extension works on its own.

## First run: the engine binary

The classification logic lives in a small command-line binary, `portreaper-cli`. On first use the extension **downloads it from the project's GitHub release and verifies it against the published SHA-256 checksum**; a binary that fails verification is deleted, never executed. Nothing is installed system-wide — the binary lives in the extension's own support directory.

If you already have it (built from source, or installed via `cargo install`), the extension finds it automatically. To point at a copy in an unusual location, set **Portreaper CLI Path** in the extension preferences.

## Why verdict reasons look like `ppid1_orphan`

Reason codes are shown exactly as the engine emits them. This extension is for developers, and `ppid1_orphan` carries more information than a vague paraphrase — it names the precise signal that fired. The desktop app's detail panel explains each code in prose.

## Links

- [Portreaper on GitHub](https://github.com/fanhefeng/portreaper) — source, releases, and the desktop app
- [How detection works](https://github.com/fanhefeng/portreaper#how-detection-works) — the full signal/exemption/confidence model

MIT licensed.

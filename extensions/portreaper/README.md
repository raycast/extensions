# Portreaper

Find the orphaned dev-server processes squatting on your ports, and reap them from Raycast.

You kill a terminal, but the `vite` / `node` / `cargo run` it launched keeps running — reparented to the OS, still holding port 3000. Next time you `npm run dev` the port is "already in use" and you have no idea which ghost to kill.

Portreaper is not a generic port viewer. Its job is to **decide which listeners are orphaned dev-server zombies**, so you can act on a verdict instead of a raw process list.

## What you get

- **Every TCP listener**, plus **orphaned dev processes that hold no port at all**. A leftover `electron-vite` main process — adopted by launchd after its parent `node` died, listening on nothing — is invisible to a port scan, but it is exactly the kind of residue worth clearing.
- **A verdict with its evidence.** Suspects are tiered `confirmed` / `likely` / `possible`, and every row shows the signals behind the call: reparented to PID 1, launcher chain ends at a dead shell, dead terminal session, dev-server command line, duplicate instance of the same project.
- **Exemptions applied automatically.** Processes managed by `launchd`, `brew services`, or `pm2`, and apps installed in a standard location, are never flagged. Identity beats location, though: a script runtime is judged by its script and a headless automation browser by its command line — so an orphaned `python app.py`, or a Playwright Chrome nobody cleaned up, is still caught even when the binary sits in a standard path.
- **Detail on demand:** launcher chain, uptime, memory, and subtree CPU — a headless browser burns CPU in child processes while its own row reads ~0%, so the subtree total is what tells you it is actually spinning.
- **Star anything to exempt it permanently.** A daemon you detached on purpose is behaviorally identical to an accidental zombie; star it once and it stops being flagged.

## How this differs from a port viewer

A port viewer answers **"what is on port 3000?"** — you already know something is in your way, and you need to find it and free it. The Store covers that case well; [Port Manager](https://www.raycast.com/dleteliers_/ports) is the closest one, and for that job a plain port viewer is the more direct tool.

Portreaper answers a different question: **"what is still running that nobody is responsible for?"** You are not looking up a port you already care about — you are finding out what the last three days of development left behind.

Everything in the design follows from that:

- **Rows are verdicts, not entries.** Each one is tiered `confirmed` / `likely` / `possible` and carries the signals behind the call. A list you still have to interpret has not answered the question.
- **Orphaned dev processes holding no port at all are included.** An orphaned `electron-vite` main process listens on nothing. Under "free this port" it is out of scope by definition; under "what did I leave behind" it is the whole point.
- **Anything with an owner is left alone.** `launchd`, `brew services`, `pm2`, apps in standard install locations, and dev servers with a live terminal behind them are exempt automatically — deciding what _not_ to flag is most of the work.
- **The verdict comes from a Rust engine shared with the Portreaper desktop app**, so both frontends agree on the classification and on your stars.

The two overlap where the questions overlap: a zombie squatting on port 3000 shows up in either tool. Everywhere else, they are answering different things.

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

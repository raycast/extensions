<h1 align="center"><img src="assets/extension-icon.png" width="23" height="23" alt="" style="vertical-align: middle;" /> Paper Agent Raycast Extension</h1>

A [Raycast](https://www.raycast.com/) extension for the [Paper Agent](https://github.com/galleonli/paper-agent) workflow: run the pipeline, browse today’s and recent papers, search your library, manage favorites and a reading queue, and schedule daily runs on macOS.

> [!IMPORTANT]
> **Repository references**
> - **Paper Agent core repo (main workflow):** https://github.com/galleonli/paper-agent
> - **Paper Agent Raycast extension repo (this project):** https://github.com/galleonli/paper-agent-raycast
>
> **Start with the [Paper Agent core README](https://github.com/galleonli/paper-agent#readme) first.** This repo contains the Raycast extension only.
> Complete core setup and run it once before using extension commands.

---

## Requirements

- **Raycast** (macOS)
- **Paper Agent core** — cloned repo with valid `config.yaml` and `paper_agent` installed (default Python is `<config_dir>/.venv/bin/python3`, or set **Python executable** in Preferences)
- **Paper directory** — a folder where the core writes notes, daily/weekly digests, and `library/` (JSON outputs)

---

## Quick start

### 1. Install Paper Agent core

Follow the [core README Quick start](https://github.com/galleonli/paper-agent#quick-start) first, then return here.
You need core installed and runnable (valid `config.yaml`, environment ready, and at least one successful run so `library/` has data).

**One-liner (Unix/macOS):**

```bash
git clone https://github.com/galleonli/paper-agent.git && cd paper-agent && ./scripts/bootstrap.sh
```

Then run the pipeline once (e.g. `./.venv/bin/python -m paper_agent run --config config.yaml`). For detailed core install (cron, config options), see the [core README Quick start](https://github.com/galleonli/paper-agent#quick-start).

### 2. Install this extension

- **From the Store:** search for “Paper Agent” in Raycast and install.
- **Local development:** clone this repo, run `npm install` and `npm run dev` to load the extension in Raycast.

### 3. Configure Preferences

Open **Raycast → Extensions → Paper Agent → Preferences** and set:

| Preference           | Description |
| -------------------- | ----------- |
| **Config file path** | Full path to the core `config.yaml` (e.g. `/path/to/paper-agent/config.yaml`). |
| **Paper directory**  | Your `delivery.paper_dir`: where notes, digests, and `library/` live. |
| **Python executable**| Optional. Leave empty to use `<config_dir>/.venv/bin/python3`. |

When you use **Run Paper Agent** or **Install Daily Schedule**, the extension builds runtime config (direction, delivery, summarize, sources, policy) from these preferences; values in `config.yaml` for those sections are overridden. Other sections (e.g. interests, export, prompts) are still read from `config.yaml`.

---

## Commands

| Command | Description |
| --------| ----------- |
| **Run Paper Agent** | Start the full pipeline in background: fetch, filter, summarize, and write local notes/library plus daily/weekly digests. Runtime fields come from Preferences (direction, delivery, summarize, sources); shared sections still come from `config.yaml`. |
| **Today Papers** | Browse today’s papers from your local library. Detail view: title, authors, abstract, “Why this paper,” optional research summary. Actions: open paper/note, related papers, mark read, favorites, reading queue. |
| **Recent Papers** | Browse recently added papers (count-based). Same detail and actions as Today Papers. Limit is set in Preferences (Recent papers limit). |
| **Search Papers** | Search the local library by title, authors, abstract, categories, date. Same list actions as above. |
| **Favorite Papers** | Papers you’ve added to favorites from any list. Stored locally in the extension. |
| **Reading Queue** | Papers you’ve queued for reading. Stored locally; same open/read/favorite actions. |
| **Install Daily Schedule** | Install a macOS `launchd` job that runs Paper Agent daily at **04:00** and catches up once after boot/login if 04:00 was missed. Re-run after changing Preferences that affect the pipeline. |
| **Remove Daily Schedule** | Uninstall the daily `launchd` job. Logs and status history are kept. |
| **Check Run Status** | View whether the daily schedule is installed, today’s result, last successful day, and last run metadata. Actions: open config directory, log directory, state directory, and last run log (when available). |
| **Open Paper Directory** | Open the configured paper directory in Finder (notes, `library/`, digests). |
| **Open Config Directory** | Open the folder that contains your `config.yaml` (core repo root) in Finder. Also available as an action in **Run Paper Agent** (Core not found) and **Check Run Status** when Config file path is set. |

---

## Core not found

If the extension can’t detect the core (missing or invalid config path, missing Python/venv, or `paper_agent` not runnable), relevant commands show **Core not found** with:

- A link to the [core repo](https://github.com/galleonli/paper-agent)
- **Copy Bootstrap Command** — copies a one-line install command; paste in a terminal to clone and bootstrap the core, then set Preferences again
- **Open Config Directory** — shown only when **Config file path** is set; opens the folder containing `config.yaml` in Finder
- **Open GitHub** — opens the core repo in the browser

---

## Development

```bash
git clone <this-repo> && cd paper-agent-raycast
npm install
npm run dev    # Load extension in Raycast for development
npm run lint   # Validate package.json and run ESLint + Prettier
npm run build  # Compile extension
```

**Publish to the Raycast Store:** `npm run publish` (see [Raycast publish docs](https://developers.raycast.com/basics/publish-an-extension)).

---

## Troubleshooting

### Core detection and preferences

- **Core not found / Run Paper Agent fails immediately** — Verify **Config file path** points to a real `config.yaml`, and **Python executable** points to a valid interpreter (or leave empty to use `<config_dir>/.venv/bin/python3`).
- **Quick verification command** — In the core repo root, run `python -m paper_agent run --help`. If this fails, fix the core environment first.
- **Paper directory mismatch** — Ensure Raycast **Paper directory** matches the core runtime output location you expect; list/search commands read from that location.

### Empty lists (Today / Recent / Search)

- **No data yet** — Run the core pipeline at least once so `library/` has JSON entries.
- **Recent is count-based** — **Recent Papers** is controlled by **Recent papers limit** (not by a day window). Increase the limit in Preferences if needed.
- **Source checks** — If data still looks empty, use core CLI checks: `python -m paper_agent today --json --config config.yaml` and `python -m paper_agent list --json --limit 20 --config config.yaml`.

### Run and schedule behavior

- **Run Paper Agent shows only “Run started in background”** — This is expected: manual runs are detached. Use **Check Run Status** and open run logs from there to inspect final success/failure.
- **Daily schedule not running** — Re-run **Install Daily Schedule** after changing Preferences that affect runtime config/secrets. Then use **Check Run Status** to confirm install state and latest run metadata.
- **Launchd scope** — Daily schedule commands are macOS `launchd` automation only.

### Scholar Inbox via Raycast

- **Enabled but no Scholar items** — Confirm Scholar Preferences are filled (`provider`, `imap host`, `imap user`, password or password env var name), then run again.
- **Credentials confusion** — If you set **Scholar IMAP password** in Preferences, Raycast injects it for runs. If left empty, ensure the configured env var exists in the execution environment.

For core-side troubleshooting (config schema, diagnostics, CLI/cron, Scholar provider behavior, output artifacts), see the [Paper Agent core Troubleshooting](https://github.com/galleonli/paper-agent#troubleshooting).

---

## License

This project is licensed under the [MIT License](LICENSE).

# Claude Profiles

Run several isolated Claude Desktop accounts side by side, and move Claude Code
session history between them.

Two parts:

- **`claude-profiles`**, a CLI that creates profiles, launches them, and moves
  session history into them. macOS and Linux.
- A **Raycast extension** that does the profile half from the Raycast launcher.
  macOS only. Both read the same profile registry.

A new profile starts with an empty Claude Code session list even though every
transcript is still on disk, because the list comes from a per-profile index and
the transcripts live in one shared store. Most of this tool exists to build and
move that index.

## Quickstart

Install the CLI:

```bash
pip install -e .
```

Create a profile and sign in to it:

```bash
claude-profiles profile add "Personal"
```

Signing in matters: it creates the `<account>/<org>` directory every migration
writes into. Quit the profile afterwards — every writing command refuses a
profile with a live Claude instance.

Back up before moving anything:

```bash
claude-profiles backup --all
```

See which CLI sessions exist and which the profile already has:

```bash
claude-profiles list --profile personal
```

Import the five most recent, then check them in the app:

```bash
claude-profiles import --to personal --limit 5
```

If anything looks wrong, reverse it:

```bash
claude-profiles undo --last
```

`--to` and `--profile` take a registered profile id, a profile name, or a path.

## Commands

| Command | What it does |
| --- | --- |
| `profile add\|list\|open\|rm` | create, launch and forget isolated profiles |
| `list` | list Claude Code CLI sessions, marked by what an import would do |
| `import` | generate index entries so CLI sessions appear in a profile |
| `migrate` | copy the session index from one profile to another |
| `backup` | snapshot profile session state, excluding runtime and credentials |
| `optimize` | clear stale error state, connector caches and dead scratch paths |
| `undo` | reverse any run that wrote something |
| `inspect` | print the shape of an index entry or a transcript |

`claude-profiles <command> --help` carries the detail. Start with `--dry-run` on
anything that writes.

### Reading `list`

| Mark | Meaning |
| --- | --- |
| `*` | already indexed in the target profile |
| `+` | already there, absorbed into a later session as a prior CLI id |
| `-` | no user content at all, always skipped |
| `~` | only built-in slash commands, skipped by `--exclude-rote-commands` |
| `s` | ran in a desktop scratch workspace, see `--scratch-sessions` |

## Safety

Every command that writes takes a rollback copy first and records what it did in
a run manifest under `$XDG_STATE_HOME/claude-profiles/runs/`. `claude-profiles
undo --list` shows them; `undo <run>` reverses one, whole or one record at a
time with `--only`.

`import` additionally:

- never opens a source transcript for writing, and records a SHA-256 before and
  after each import, failing if the file moved
- writes nothing into `~/.claude` at all unless `--remap` is used, in which case
  the rewritten copy is published under a **new** session id and the original
  stays addressable
- refuses to import a subagent sidechain as a session
- verifies after writing that no working-directory field in a generated entry
  still names the template session's folder
- resets every per-session permission grant, so approvals given to one session
  never ride along to another

## Reference

- [Session storage](docs/session-storage.md) — the two locations, project slugs,
  subagents, scratch workspaces, and how duplicates are detected
- [The session index](docs/session-index.md) — field policy, permissions, and
  the working-directory rule
- [Linux](docs/linux.md) — install, paths, and the running-window caveat
- [Verifying on Linux](docs/verify-on-linux.md) — the container test

## Development

```bash
python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
```

```bash
.venv/bin/pytest && .venv/bin/ruff check . && .venv/bin/mypy claude_profiles
```

The Raycast extension:

```bash
npm install && npm run dev
```

`tools/` holds forensic scripts that document undocumented formats. Each records
what it established in its header, so re-running one after a Claude Desktop
update tells you whether that finding still holds. They are macOS-only.

| Script | Establishes |
| --- | --- |
| `trace-subagents.sh` | the sidechain layout and the `promptId` join |
| `permission-audit.sh` | where permission settings live, and their valid enums |
| `sample-brand-color.sh` | the brand hex, sampled from an app icon |
| `make-icon.sh` | rebuilds `assets/icon.png` from `swap_icon.svg` |

`assets/icon.png` is tinted `#D97757`, the most common opaque non-white pixel in
Claude Desktop's own icon. Rebuilding it needs `rsvg-convert` (`brew install
librsvg`, or `apt install librsvg2-bin`). The source artwork is "swap" by Evan
Shuster, from the Noun Project.

## Limitations

Each profile is a fully separate Claude account. There is no shared memory, chat
history, or context between them. This makes switching faster; it does not merge
accounts.

Claude Desktop checks whether its `userData` path is the default location. Any
profile launched by this tool fails that check, which disables local pairing in
that instance. Your default profile, launched normally, is unaffected.

The index schema is undocumented and changes between app versions. Re-run the
scripts in `tools/` after an update before trusting a large migration.

## License

MIT. See [LICENSE](LICENSE).

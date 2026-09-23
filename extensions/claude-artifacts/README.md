# Claude Artifacts

<div align="center">
  <a href="https://github.com/chrismessina">
    <img src="https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social" alt="Follow @chrismessina">
  </a>
  <a href="https://github.com/chrismessina/raycast-claude-artifacts/stargazers">
    <img src="https://img.shields.io/github/stars/chrismessina/raycast-claude-artifacts?style=social" alt="Stars">
  </a>
  <a href="https://www.raycast.com/chrismessina/claude-artifacts">
    <img src="https://img.shields.io/badge/Raycast-Store-red.svg" alt="Claude Artifacts on Raycast store.">
  </a>
</div>

Search your Claude Code artifacts from Raycast, and open the right one in one keystroke.

## The problem

You're juggling ten projects. A Claude Code agent finishes an overnight build and hands you an artifact to review. Two days later you need it again — and it's buried somewhere in forty browser tabs, or your browser archived the tab, and now the only way to find it is to scroll the artifacts gallery on claude.ai and hope you recognize the title.

Artifacts are easy to _make_ and weirdly hard to _find again_. This extension makes them searchable from where you already start every task.

## Why this isn't part of the existing Claude extension

There is already an excellent [Claude extension](https://www.raycast.com/florisdobber/claude) for Raycast. This is deliberately separate, for one reason:

**That extension authenticates with an Anthropic API key. Artifacts are not reachable with an Anthropic API key.**

Artifacts live behind your claude.ai _account_ session — a completely different credential from the API key that powers the Messages API. If an Artifacts command lived inside the API-key extension, Raycast would prompt you for your API key, the artifacts would load anyway (via a different mechanism entirely), and you'd have false evidence the key was doing something. The first time the list broke, you'd go debug the wrong credential.

One extension, one honest dependency.

## How it works

There is no artifacts API available to individual users, so this extension doesn't call one. Instead:

1. **A Claude Code hook** watches for artifacts as they're published and appends each one to a local index at `~/.claude/artifacts.json`.
2. **The Raycast commands** read that file — instantly, offline, no network call.

That's the whole architecture. It's a local file and a list.

### Commands

**Search Artifacts** — the list, newest first.

| Action                                                     |                                                                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Open**                                                   | ⏎                                                                                                        |
| **Copy Link** / **Copy Title**                             | ⌘⇧C / ⌘⌥C                                                                                                |
| **Open Folder**                                            | ⌘O — the directory the artifact was published from                                                       |
| **Pin Artifact**                                           | ⌘. — pinned artifacts collect in a **Pinned** section at the top, and stay there inside a project filter |
| **View Claude Code Artifacts** / **View Claude Artifacts** | ⌘⇧O / ⌘⇧G — the two galleries on claude.ai, offered in every state including the empty ones              |

Filter by project once more than one project has published, and search matches title and project.

**Run Doctor** — checks that recording still works, and recovers anything it missed. See
[When the list stops growing](#when-the-list-stops-growing--the-run-doctor-command).

### Setup

**1. Install the recording hook** (one time)

Copy the hook script and make it executable:

```bash
mkdir -p ~/.claude/hooks
cp scripts/record-artifact.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/record-artifact.sh
```

[`scripts/record-artifact.sh`](./scripts/record-artifact.sh) is the only thing that writes the index as you work — the one other writer is **Backfill**, which you run by hand from **Run Doctor** and which only ever appends rows it found in your transcripts. It lives in the repo rather than inside the extension bundle so you can read exactly what runs on your machine before you install it — it makes no network calls and touches nothing but the index and its own log.

Then register it in `~/.claude/settings.json`. If a `hooks.PostToolUse` array already exists, **append** this entry rather than replacing the array:

```jsonc
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Artifact",
        "hooks": [{ "type": "command", "command": "$HOME/.claude/hooks/record-artifact.sh", "timeout": 10 }],
      },
    ],
  },
}
```

`$HOME` expands here — verified on macOS, 2026-07-25, by publishing an artifact and confirming the hook recorded it. (Claude Code's hooks reference documents only `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, and `${CLAUDE_PLUGIN_DATA}` as placeholders _it_ expands, so this relies on shell expansion rather than documented behavior. If the index never grows, substitute your real absolute path — that always works.)

The hook requires [`jq`](https://jqlang.github.io/jq/) (`brew install jq`) and `perl` (preinstalled on macOS). If either is missing it exits quietly rather than failing your Claude Code turn — `perl` provides the `flock(2)` lock that keeps concurrent publishes from losing rows.

Registration takes effect in a **new** Claude Code session — restart it before expecting the index to update.

**2. Seed the index with your existing artifacts** (one time, optional)

The hook only records artifacts published _after_ you install it. To backfill, ask Claude Code in an interactive session:

> List my artifacts and write them to `~/.claude/artifacts.json` using the schema in this repo's README.

**3. Search**

Open Raycast → **Search Artifacts**. Sorted most-recent-first, because the one you want is almost always the one you just made.

### Index format

`~/.claude/artifacts.json`. Only `id`, `title`, and `url` are required; the rest are optional, because shared artifacts carry no date and seeded rows have no project.

```jsonc
{
  "version": 1,
  "artifacts": [
    {
      // Illustrative only — not a real artifact.
      "id": "Dq4mWqUCLwYSUCn5o4WAHr",
      "title": "Checkout Flow — State Matrix",
      "url": "https://claude.ai/artifact/Dq4mWqUCLwYSUCn5o4WAHr",
      "updated": "2026-09-14", // optional — absent on shared artifacts
      "owner": "mine", // "mine" | "shared"
      "project": "example-app", // optional — basename of the publishing directory
      "cwd": "/Users/you/dev/example-app", // optional — powers "Open Folder"
    },
  ],
}
```

The reader is deliberately forgiving: it accepts a bare array, skips unusable rows rather than blanking the list, de-dupes by `id` (last write wins), and sorts undated artifacts last.

### When the list stops growing — the Run Doctor command

The recording hook is best-effort **by contract**: it must never fail a Claude Code turn, so every failure path in it exits 0. That makes silence its only failure mode. It happened for real on 2026-09-10 — artifact URLs changed from `claude.ai/code/artifact/<uuid>` to `claude.ai/artifact/<slug>`, the hook no longer recognised its own payload, and it went on running cleanly on every publish while recording nothing for nine days. The script was installed, executable, registered, and firing the whole time.

**Run Doctor** exists because none of those facts were evidence. It checks the chain end to end:

| Check                             | What it means when it fails                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| Hook Dependencies                 | `jq` or `perl` is missing, so the hook exits before doing anything |
| Recorder Script                   | The script is absent, or present but not executable                |
| Hook Registration                 | Nothing is registered, or hooks are switched off entirely          |
| **Records Current Artifact URLs** | Your copy of the recorder no longer understands the payload        |
| Artifact Index                    | The index is missing or unreadable                                 |
| Index Coverage                    | Your transcripts contain publishes the index never got             |

The fourth one is the only check that could have caught the outage, and it is the only one that tests _behaviour_: it runs **your** installed hook, with `HOME` pointed at a temporary directory, against a current-format artifact URL, and looks at whether a row came out. Your real index is never opened.

**Backfill Missing Artifacts** (⌘⇧R) then recovers what was lost. Claude Code writes a transcript of every session to `~/.claude/projects/`, and a publish leaves its URL, title, and working directory there — so the artifacts are recoverable locally, with no network call. Backfill is strictly append-only: it adds rows whose `id` the index does not already have, and never modifies or removes one that is already there — so a row the hook wrote while you were reading this screen wins over the older copy in the scan. It copies the index aside first, and takes the same kernel lock the recorder uses, so it cannot lose a row to a publish landing mid-write.

It can only recover what Claude Code recorded. An artifact published from the Claude desktop app, from claude.ai, or from another machine was never in a transcript on this one, and the galleries linked in every empty state remain the place to find it.

### Verifying the hook yourself

Claude Code documents the hook _config_ contract, but the `Artifact` tool's response shape is undocumented. It was verified empirically on 2026-07-25 (see [`docs/hook-payload.md`](./docs/hook-payload.md) for the captured payload), and `record-artifact.sh` is written against what was observed — with fallbacks, including a regex sweep of the whole payload, in case the shape changes.

Since it _can_ change, [`scripts/probe-artifact-hook.sh`](./scripts/probe-artifact-hook.sh) is included so you can re-check it yourself rather than trusting this README. Install it the same way as the recording hook, publish an artifact, then:

```bash
scripts/probe-artifact-hook.sh --report
```

It prints the top-level keys, the `tool_response` type, any artifact URLs found, and the most recent payload pretty-printed. It only appends to `~/.claude/artifact-probe.jsonl`, owner-readable — no network calls, no writes to the index, no config changes — and it's safe to delete once you're satisfied. (The capture holds session ids and transcript paths, which is why it isn't written to a shared location like `/tmp`.)

This is also the honest answer to "how do you know this works?": the probe is how you check, and it's included so the answer isn't just this README's word for it.

## Requirements

- **macOS** — see [Windows support](#windows-support) below
- **[Claude Code](https://code.claude.com)**, logged in to a Claude account (Pro, Max, Team, or Enterprise)
- **[`jq`](https://jqlang.github.io/jq/)** (`brew install jq`) and **`perl`** (preinstalled on macOS) for the recording hook — the **Run Doctor** command reports either one missing
- Artifacts enabled for your account

## Limitations — please read before installing

This extension maintains a **local mirror**, not a live view. Be clear-eyed about what that means:

- **It only records artifacts published after you install the hook**, from **machines where the hook is installed.** The one-time seed backfills your history up to setup; the hook covers everything after. If the hook ever misses a stretch, **Run Doctor** can recover it from your local Claude Code transcripts.
- **Renames and deletions don't propagate.** If you rename an artifact on claude.ai, the index keeps the old title until that artifact is republished. Over months, the index will drift from reality.
- **Artifacts created outside Claude Code** — in the Claude desktop app or on claude.ai directly — won't be captured by the hook.
- **Chat artifacts are not supported.** Claude has two separate artifact systems; this covers Claude Code artifacts, published under `claude.ai/artifact/…` (and `claude.ai/code/artifact/…` before the scheme changed in September 2026 — both are recognised). Chat artifacts have no sanctioned programmatic access at all.

Because of those last two, every state in this extension — including "no artifacts" and "no matches" — offers **View Claude Code Artifacts** (⌘⇧O) and **View Claude Artifacts** (⌘⇧G), which jump to `claude.ai/code/artifacts` and `claude.ai/artifacts`. When an artifact isn't in the index, it usually isn't missing — it was published somewhere the hook can't see, and that gallery is where it actually lives.

- **Rename, Share, Delete, and Version history are not available here.** Those exist on the artifact's page on claude.ai, but they're backed by session-cookie web endpoints, not by anything the `Artifact` tool exposes — it offers only publish and list. Automating them would mean driving claude.ai with your session cookie, which [Anthropic's Consumer Terms](https://www.anthropic.com/legal/consumer-terms) prohibit (§3, automated access) and which no Store extension could ship. **Open** (⏎) takes you to the page where those controls live; that's the honest boundary.

### Why not just call an API?

Because there isn't one you're allowed to use. This was researched thoroughly:

| Approach                                                                                     | Why it doesn't work                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic Messages API                                                                       | Stateless. Has no access to your account's artifacts or conversations.                                                                                                                                                                                                       |
| [**Compliance API**](https://platform.claude.com/docs/en/api/compliance/code/artifacts/list) | Genuinely the right endpoint — real, documented, paginated JSON. But it requires an **Enterprise** Compliance Access Key from claude.ai admin settings, and it's scoped to an entire organization (everyone's artifacts), not your personal gallery. Unavailable on Pro/Max. |
| Headless `claude -p`                                                                         | The artifact-listing tool is an interactive-only tool. Verified: it is not exposed to headless mode.                                                                                                                                                                         |
| claude.ai internal endpoints                                                                 | Would require your session cookie. This violates Anthropic's [Consumer Terms](https://www.anthropic.com/legal/consumer-terms), which prohibit automated access outside of an API key. Not implemented, and never will be.                                                    |
| Reading local app data                                                                       | The Claude desktop app stores no artifact index on disk — only evictable browser cache.                                                                                                                                                                                      |
| An MCP server                                                                                | None exists. The [feature request](https://github.com/anthropics/claude-code/issues/12858) was closed as not planned.                                                                                                                                                        |

The hook approach is the one that's both **sanctioned and actually works**. If Anthropic ships a personal-scope artifacts API, this extension should be rewritten to use it — the local index is versioned so that migration stays cheap.

## Windows support

**This extension is currently macOS-only**. That is a deliberate choice because **the mechanism that populates the Artifacts index is not available on Windows.**

- **The command** reads `~/.claude/artifacts.json` via `os.homedir()`, which resolves correctly on Windows. Nothing in the UI is Mac-specific.
- **The recording hook** ([`scripts/record-artifact.sh`](./scripts/record-artifact.sh)) is `bash` + [`jq`](https://jqlang.github.io/jq/). Claude Code spawns it as a subprocess, so on Windows it would need a PowerShell equivalent.

Shipping `platforms: ["macOS", "Windows"]` without that would be a UI lying about its state: a Windows user installs the extension, the command loads fine, and the list stays permanently empty with no indication why.

### What adding it would take

1. **`scripts/record-artifact.ps1`** — a PowerShell port of the hook. The logic is small but the hard parts are not the syntax: it needs the same **upsert by `id`** (republishing reuses the URL, so appending duplicates), the same **atomic write**, and the same **kernel-backed cross-process lock**. That last one is where the bash version lost two rounds: a lockfile-plus-age-based-reaper design silently drops rows under burst publishing and cannot be fixed by tuning the threshold — see [`docs/hook-payload.md`](./docs/hook-payload.md). On Windows the equivalent is an exclusive `FileStream` (`[System.IO.FileShare]::None`), which the OS releases on process death; do not reimplement the reaper.
2. **`platforms: ["macOS", "Windows"]`** in `package.json`, plus restoring the platform-explicit form on the one custom shortcut (`{ macOS: …, Windows: … }` on "Reveal Index File" — a bare `cmd` binding does not exist on Windows).
3. **Verifying `$HOME` expansion**, or substituting `$env:USERPROFILE`, in the hook's `command` field on Windows. This is unverified there; on macOS it works (see [`docs/hook-payload.md`](./docs/hook-payload.md)).
4. **Confirming the payload shape is identical** on Windows — run [`scripts/probe-artifact-hook.sh`](./scripts/probe-artifact-hook.sh)'s PowerShell equivalent and compare against the captured macOS payload.

There's a plausible better path than a second script: a **"Setup Hook" command** inside the extension that writes the correct hook for the host platform, using [`runPowerShellScript`](https://developers.raycast.com/utilities/functions/runpowershellscript) on Windows. That would improve the setup story on macOS too, which today is "copy a file and hand-edit JSON."

### Want it? Help test it

**I don't run Windows, so I can't verify any of the above** — and shipping an untested platform claim is worse than declaring macOS-only. If you use Claude Code on Windows and want this, [request Windows support](https://github.com/raycast/extensions/issues/new?template=extension_feature_request.yml&title=%5BClaude+Artifacts%5D+Windows+support&labels=extension%2Cfeature&type=Feature&extension-url=https%3A%2F%2Fwww.raycast.com%2Fchrismessina%2Fclaude-artifacts) in the Raycast extensions repo.

A capture from the probe (step 4) is genuinely the most useful thing you could attach: it answers whether the payload shape holds on Windows, which is the one fact the port depends on and the one I cannot get myself.

## License

MIT

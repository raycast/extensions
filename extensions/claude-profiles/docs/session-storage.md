# How Claude Code session storage works

Claude Code state is split across two locations, and only one of them is
isolated by `--user-data-dir`.

| What | Where | Per profile? |
| --- | --- | --- |
| Session transcripts | `~/.claude/projects/<slug>/<id>.jsonl` | No, shared |
| Desktop session index | `<profile>/claude-code-sessions/<acct>/<org>/local_<id>.json` | Yes |

A new profile therefore shows no sessions even though every transcript is still
on disk. Both `import` and `migrate` work on the index, never on a transcript.

## Project slugs

The CLI names a project folder by collapsing `/`, `_` and `.` in the working
directory to `-`. The encoding is lossy and cannot be reversed, which is why a
working directory is always read from inside a transcript and never parsed back
out of a folder name.

## Subagents

Subagent work nests one level deeper:

```
<slug>/<sessionId>.jsonl                         a session
<slug>/<sessionId>/subagents/agent-<hash>.jsonl  a sidechain
```

A sidechain carries the parent's session id on every line and is joined to a
parent turn by a shared `promptId`. The app renders it inline inside the
parent and never gives it an index entry, so `import` refuses to treat one as a
session. When `--remap` republishes a parent, the whole subagents directory is
republished with it, or those inline blocks render empty.

Each sidechain file carries an `agentId` matching its own filename,
`isSidechain` true on every line, and `sessionKind` `"bg"`.

`tools/trace-subagents.sh` re-establishes this layout against live data.

## Scratch workspaces

A desktop chat started without attaching a folder runs in a scratch workspace
the app computes itself, as `<userData>/scratch-workspaces/<account>/<org>/
scratch-<date>-<hex>`. No setting feeds it, so it cannot be redirected. The
directory is app-internal and is emptied when the session ends, so a migrated
session that names one points at a folder that no longer exists.

`import --scratch-sessions` decides what to do with those: `import` them as they
are (the default), `skip` them, or `relocate` them onto a real folder you pass
with `--scratch-dir`. Only the entry changes; the transcript is untouched.

## Sessions a profile already has

An index entry claims a CLI session two ways:

- `cliSessionId` — the entry **is** that session.
- `priorCliSessionIds` — the entry is a **later** segment that absorbed it, which
  is how the app records a session resumed or compacted into a new CLI id.

Both count, so neither is re-imported by default. That lineage lives only in an
index entry; a successor's transcript never names its predecessor. `import`
therefore reads every profile on the machine, which lets a fresh profile inherit
what another one already learned.

`--overwrite` replaces the existing entry when that entry is the same session.
When a later session merely absorbed this one, it adds a second entry and leaves
the newer conversation alone, since removing it would delete a session that is
not the one being imported.

## Sessions that record no work

A session with no user content is always skipped. `--exclude-rote-commands`
additionally skips sessions whose only content is built-in commands that read
state or change Claude's own settings, such as `/model`, `/clear`, `/usage` and
`/exit`.

The CLI writes one slash command as three user turns, so a session holding only
`/exit` reports three turns and does not look empty by turn count. The command
list is an allowlist: a custom command, a plugin command, or a built-in added by
a later release always counts as real content and keeps its session. Commands
that write project files or change tool state, among them `/init`, `/rewind`,
`/agents` and `/mcp`, are deliberately absent.

Neither rule rewrites a transcript. A session is indexed whole or not at all.

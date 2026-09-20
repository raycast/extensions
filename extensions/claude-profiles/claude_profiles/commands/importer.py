"""generate index entries so CLI sessions show up in a Claude Desktop profile.

the transcript is already on disk; this only adds an entry pointing at it.
without ``--remap`` nothing is written into ``~/.claude``; with it, a
rewritten copy is published under a new session id.
"""

from __future__ import annotations

import argparse
import json
import shutil
import uuid
from pathlib import Path
from typing import Any

from .. import Abort
from ..index import (
    PERMISSION_FIELDS,
    STRUCTURAL_KEYS,
    all_session_scopes,
    build_entry,
    indexed_cli_map,
    lineage_map,
    load_template,
    resolve_permissions,
    session_scope,
    walk_cwds,
)
from ..paths import cli_projects, profile_is_running, resolve_profile
from ..staging import new_run, sha256, write_manifest
from ..transcripts import (
    SUBAGENT_DIR,
    derive,
    find_transcript,
    read_lines,
    slug_for,
    subagent_count,
    subagent_dir_for,
    summarize,
    top_level_transcripts,
)


def run_list(args: argparse.Namespace) -> int:
    rows = [r for r in (summarize(f) for f in top_level_transcripts()) if r]
    rows.sort(key=lambda r: r["lastActivityAt"], reverse=True)

    indexed: dict[str, dict[str, Any]] = {}
    if args.profile:
        try:
            indexed = indexed_cli_map(session_scope(resolve_profile(args.profile)))
        except Abort:
            indexed = {}

    shown = rows[: args.limit]
    print(f"{'':2}{'SESSION':38} {'TURNS':>5} {'AGENTS':>6}  TITLE")
    for row in shown:
        claim = indexed.get(row["cliSessionId"])
        if claim:
            mark = "*" if claim["via"] == "cliSessionId" else "+"
        else:
            mark = {"isEmpty": "-", "isRote": "~", "isScratch": "s"}.get(
                next((k for k in ("isEmpty", "isRote", "isScratch") if row[k]), ""), " "
            )
        note = ""
        if row["isRote"]:
            note = f"   [{' '.join(row['commands'])}]"
        if row["isScratch"]:
            note = "   [scratch workspace]"
        print(
            f"{mark:2}{row['cliSessionId']:38} {row['turns']:>5} "
            f"{row['subagents']:>6}  {row['title'][:44]}{note}"
        )

    hidden = len(list(cli_projects().glob(f"*/*/{SUBAGENT_DIR}/*.jsonl")))
    print(f"\n{len(rows)} sessions in {cli_projects()}")
    if hidden:
        print(f"{hidden} subagent sidechains hidden (rendered inline, never importable)")
    legend = [
        ("*", any(c["via"] == "cliSessionId" for c in indexed.values()), "already in the profile"),
        ("+", any(c["via"] == "priorCliSessionIds" for c in indexed.values()),
         "already there, absorbed into a later session"),
        ("-", any(r["isEmpty"] for r in shown), "no user content at all, always skipped"),
        ("~", any(r["isRote"] for r in shown),
         "only built-in slash commands, skipped by --exclude-rote-commands"),
        ("s", any(r["isScratch"] and r["cliSessionId"] not in indexed for r in shown),
         "ran in a desktop scratch workspace, see --scratch-sessions"),
    ]  # fmt: skip
    for mark, shows, text in legend:
        if shows:
            print(f"{mark} {text}")
    return 0


def _no_content(row: dict[str, Any], args: argparse.Namespace) -> str | None:
    """why this session records no work, or None if it does."""
    if row["isEmpty"]:
        return "no user content at all"
    if row["isRote"] and args.exclude_rote_commands:
        return f"only built-in commands: {' '.join(row['commands'])}"
    if row["isScratch"] and args.scratch_sessions == "skip":
        return "ran in a desktop scratch workspace"
    return None


def _cwd_override(row: dict[str, Any], args: argparse.Namespace) -> str | None:
    if row["isScratch"] and args.scratch_sessions == "relocate":
        return str(args.scratch_dir.expanduser())
    return None


class Selection:
    def __init__(self) -> None:
        self.targets: list[Path] = []
        self.skipped: dict[str, dict[str, Any]] = {}
        self.contentless: list[dict[str, Any]] = []
        self.overrides: dict[str, str | None] = {}


def select(args: argparse.Namespace, already: dict[str, dict[str, Any]]) -> Selection:
    """decide what to import; skip anything already indexed unless named in ``--overwrite``."""
    picked = Selection()
    forced = set(args.overwrite)

    if args.session:
        picked_path = find_transcript(args.session)
        if not picked_path:
            raise Abort(f"no session {args.session}. Use `claude-profiles list` to browse.")
        row = summarize(picked_path)
        why = _no_content(row, args) if row else None
        if why:
            raise Abort(f"{args.session} has nothing to import: {why}")
        if args.session in already and args.session not in forced:
            picked.skipped[args.session] = already[args.session]
        else:
            picked.targets.append(picked_path)
            if row:
                picked.overrides[args.session] = _cwd_override(row, args)

    elif args.limit:
        rows = [r for r in (summarize(f) for f in top_level_transcripts()) if r]
        rows.sort(key=lambda r: r["lastActivityAt"], reverse=True)
        picked.skipped.update(
            {
                r["cliSessionId"]: already[r["cliSessionId"]]
                for r in rows
                if r["cliSessionId"] in already
            }
        )
        lineage = lineage_map(all_session_scopes())
        candidates = {r["cliSessionId"] for r in rows if r["cliSessionId"] not in already}

        fresh = []
        for row in rows:
            cli_id = row["cliSessionId"]
            if cli_id in already:
                continue
            merged = lineage.get(cli_id)
            if (
                merged
                and cli_id not in forced
                and (merged["successor"] in already or merged["successor"] in candidates)
            ):
                picked.skipped[cli_id] = {
                    "entry": None,
                    "sessionId": merged["successor"],
                    "title": merged["title"],
                    "via": "priorCliSessionIds",
                }
                continue
            why = _no_content(row, args)
            if why:
                picked.contentless.append({**row, "why": why})
            else:
                fresh.append(row)

        for row in fresh[: args.limit]:
            picked.targets.append(row["path"])
            picked.overrides[row["cliSessionId"]] = _cwd_override(row, args)

    for cli_id in args.overwrite:
        path = find_transcript(cli_id)
        if not path:
            raise Abort(f"no session {cli_id}. Use `claude-profiles list` to browse.")
        row = summarize(path)
        if row and row["isEmpty"]:
            raise Abort(f"{cli_id} has nothing to import: no user content at all")
        if path not in picked.targets:
            picked.targets.append(path)
            if row:
                picked.overrides[cli_id] = _cwd_override(row, args)
        picked.skipped.pop(cli_id, None)

    return picked


def remap_line(
    obj: dict[str, Any], old: str, new: str, content_too: bool
) -> tuple[dict[str, Any], int]:
    """rewrite paths in one transcript line; content mode also reaches paths in message bodies."""
    if content_too:
        raw = json.dumps(obj)
        hits = raw.count(old)
        return (json.loads(raw.replace(old, new)) if hits else obj), hits

    hits = 0
    for key in STRUCTURAL_KEYS:
        value = obj.get(key)
        if isinstance(value, str) and old in value:
            obj[key] = value.replace(old, new)
            hits += 1
    return obj, hits


def rewrite_file(src: Path, dst: Path, old: str, new: str, content_too: bool, new_id: str) -> int:
    hits = 0
    out = []
    for obj in read_lines(src):
        obj, n = remap_line(obj, old, new, content_too)
        obj["sessionId"] = new_id
        hits += n
        out.append(json.dumps(obj))
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text("\n".join(out) + "\n")
    return hits


def _republish(
    transcript: Path, run: Path, remap: tuple[str, str], content_too: bool
) -> dict[str, Any]:
    """write a path-rewritten copy of a transcript under a new session id."""
    old, new = remap
    new_id = str(uuid.uuid4())
    staged = run / "work" / transcript.name
    hits = rewrite_file(transcript, staged, old, new, content_too, new_id)

    facts = derive(read_lines(staged), staged)
    target_dir = cli_projects() / slug_for(facts["cwd"])
    published = target_dir / f"{new_id}.jsonl"
    if published.exists():
        raise Abort(f"refusing to overwrite {published}")
    target_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(staged, published)

    # sidechains must be republished with the parent, or the inline subagent
    # blocks in the migrated session render empty.
    published_agents = None
    source_agents = subagent_dir_for(transcript)
    if source_agents.is_dir():
        published_agents = target_dir / new_id / SUBAGENT_DIR
        published_agents.mkdir(parents=True, exist_ok=True)
        for side in sorted(source_agents.glob("*.jsonl")):
            staged_side = run / "work" / f"{new_id}-{side.name}"
            hits += rewrite_file(side, staged_side, old, new, content_too, new_id)
            shutil.copy2(staged_side, published_agents / side.name)

    return {
        "id": new_id,
        "cwd": facts["cwd"],
        "published": published,
        "agents": published_agents,
        "hits": hits,
    }


def import_one(
    transcript: Path,
    scope: Path,
    template: dict[str, Any],
    run: Path,
    perms: dict[str, str],
    args: argparse.Namespace,
    remap: tuple[str, str] | None,
    replaces: dict[str, Any] | None,
    cwd_override: str | None,
) -> dict[str, Any]:
    digest = sha256(transcript)
    lines = read_lines(transcript)
    if not lines:
        raise Abort(f"transcript has no parseable lines: {transcript}")
    facts = derive(lines, transcript)

    if facts["isSidechain"] and not args.allow_sidechain:
        raise Abort(
            f"{transcript.name} is a subagent sidechain, not a session.\n"
            "  It carries its parent's session id and the app renders it inline\n"
            "  inside the parent. Pass --allow-sidechain to force."
        )

    original_cwd = facts["cwd"]
    if cwd_override:
        facts["cwd"] = facts["originCwd"] = cwd_override

    published_id = facts["cliSessionId"]
    copy: dict[str, Any] | None = None
    if remap:
        copy = _republish(transcript, run, remap, args.rewrite_content)
        published_id = copy["id"]
        facts["cwd"] = facts["originCwd"] = copy["cwd"]

    entry, tally = build_entry(template, facts, published_id, perms)
    dest = scope / f"{entry['sessionId']}.json"
    if dest.exists():
        raise Abort(f"refusing to overwrite {dest}")

    # an entry that merely absorbed this session is never removed.
    replaced: Path | None = None
    backup: Path | None = None
    if replaces and replaces["via"] == "cliSessionId":
        existing = Path(replaces["entry"])
        if existing.is_file():
            (run / "replaced").mkdir(parents=True, exist_ok=True)
            backup = run / "replaced" / existing.name
            shutil.copy2(existing, backup)
            replaced = existing
            existing.unlink()

    dest.write_text(json.dumps(entry))

    # roll back rather than abort a batch whose manifest does not exist yet.
    if sha256(transcript) != digest and not args.allow_live:
        dest.unlink(missing_ok=True)
        if backup and replaced:
            shutil.copy2(backup, replaced)
        return {
            "skipped": "transcript changed during import; that session is still running",
            "title": facts["title"],
            "sourceCliSessionId": facts["cliSessionId"],
        }

    return {
        "indexEntry": str(dest),
        "sessionId": entry["sessionId"],
        "cliSessionId": published_id,
        "sourceCliSessionId": facts["cliSessionId"],
        "title": entry["title"],
        "turns": entry["completedTurns"],
        "cwd": entry["cwd"],
        "originalTranscript": str(transcript),
        "originalSha256": digest,
        "publishedTranscript": str(copy["published"]) if copy else None,
        "publishedSubagents": str(copy["agents"]) if copy and copy["agents"] else None,
        "subagentCount": subagent_count(transcript),
        "remap": f"{remap[0]}={remap[1]}" if remap else None,
        "pathRewrites": copy["hits"] if copy else 0,
        "fieldTally": dict(tally),
        "replacedEntryPath": str(replaced) if replaced else None,
        "replacedEntryBackup": str(backup) if backup else None,
        "relocatedFrom": original_cwd if cwd_override else None,
        "wasLive": args.allow_live and sha256(transcript) != digest,
    }


def _report_skipped(skipped: dict[str, dict[str, Any]], profile: Path) -> None:
    if not skipped:
        return
    print(f"\n  {len(skipped)} already in this profile, not re-imported:")
    for cli_id in sorted(skipped, key=lambda i: skipped[i]["title"]):
        row = skipped[cli_id]
        how = "is" if row["via"] == "cliSessionId" else "absorbed into"
        print(f"    {cli_id}  {row['title'][:40]:40} {how} {row['sessionId']}")
    print(f'  Force one with: claude-profiles import --to "{profile}" --overwrite ID')
    print("  (replaces the entry when it is the same session; adds a second one otherwise)\n")


def _report_contentless(rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    print(f"\n  {len(rows)} carry no user content, not imported:\n")
    for row in sorted(rows, key=lambda r: r["title"]):
        print(f"    {row['cliSessionId']}  {row['title'][:44]}")
        print(f"      {row['why']}")
    print()


def _validate(records: list[dict[str, Any]]) -> bool:
    ok = True
    live = 0
    for rec in records:
        if rec["wasLive"]:
            live += 1
        elif sha256(Path(rec["originalTranscript"])) != rec["originalSha256"]:
            print(f"  FAIL original modified: {Path(rec['originalTranscript']).name}")
            ok = False

        entry_path = Path(rec["indexEntry"])
        try:
            written = json.loads(entry_path.read_text())
        except (OSError, ValueError) as exc:
            print(f"  FAIL bad index JSON {entry_path.name}: {exc}")
            ok = False
            continue

        pointed = Path(rec["publishedTranscript"] or rec["originalTranscript"])
        if not pointed.is_file():
            print(f"  FAIL index points at missing transcript: {pointed}")
            ok = False

        stray = [f"{at}={v}" for at, v in walk_cwds(written) if v != rec["cwd"]]
        if stray:
            print(f"  FAIL wrong working directory in {entry_path.name}: {', '.join(stray)}")
            ok = False

        backup = rec["replacedEntryBackup"]
        if backup and not Path(backup).is_file():
            print(f"  FAIL replaced entry not backed up: {rec['replacedEntryPath']}")
            ok = False

    if ok:
        print(f"  ok  {len(records)} originals unchanged, entries valid, transcripts resolvable")
        if live:
            print(f"      {live} still running, hash not asserted (--allow-live)")
    return ok


def run_import(args: argparse.Namespace) -> int:
    if not args.session and not args.limit and not args.overwrite:
        raise Abort("pass --session ID, --limit N, or --overwrite ID (`list` to browse)")

    remap = None
    if args.remap:
        old, _, new = args.remap.partition("=")
        if not old or not new:
            raise Abort("--remap expects OLD=NEW, both sides non-empty")
        remap = (old, new)
    elif args.rewrite_content:
        raise Abort("--rewrite-content only means something together with --remap")

    if args.scratch_sessions == "relocate" and not args.scratch_dir:
        raise Abort("--scratch-sessions relocate needs --scratch-dir")

    profile = resolve_profile(args.to)
    if not profile.is_dir():
        raise Abort(f"target profile not found: {profile}")
    if profile_is_running(profile):
        raise Abort("a Claude instance is running on the target profile; quit it first")

    scope = session_scope(profile)
    template, template_path = load_template(scope, args.template)
    already = indexed_cli_map(scope)
    perms, why = resolve_permissions()

    picked = select(args, already)
    unknown = set(args.overwrite) - set(already)

    if not picked.targets:
        print("Nothing to import; every session is already in this profile.")
        _report_skipped(picked.skipped, profile)
        _report_contentless(picked.contentless)
        return 0

    print("Claude Code CLI session import\n")
    print(f"  profile  : {profile}")
    print(f"  account  : {scope.parent.name}/{scope.name}")
    print(f"  template : {template_path.name}")
    print("  permissions:")
    for key in PERMISSION_FIELDS:
        print(f"    {key:22} {perms[key]!r}  {why[key]}")
    if remap:
        reach = "structural + content" if args.rewrite_content else "structural only"
        print(f"  remap    : {remap[0]} -> {remap[1]}  ({reach})")
    if unknown:
        print(f"  note     : --overwrite named {len(unknown)} id(s) not in the profile")

    print(f"\n  {len(picked.targets)} session(s) to import:")
    for path in picked.targets:
        row = summarize(path)
        if row:
            extra = f", {row['subagents']} subagents" if row["subagents"] else ""
            print(f"    {row['title'][:50]}  ({row['turns']} turns{extra})")
        claim = already.get(path.stem)
        if claim:
            verb = "replaces" if claim["via"] == "cliSessionId" else "adds a second entry beside"
            print(f"      OVERWRITE {verb} {claim['sessionId']}")

    _report_skipped(picked.skipped, profile)
    _report_contentless(picked.contentless)

    if args.dry_run:
        print("Dry run, nothing written.")
        return 0

    run = new_run("import", args.staging)
    forced = set(args.overwrite)
    records: list[dict[str, Any]] = []
    unfinished: list[dict[str, Any]] = []
    for path in picked.targets:
        got = import_one(
            path,
            scope,
            template,
            run,
            perms,
            args,
            remap,
            already.get(path.stem) if path.stem in forced else None,
            picked.overrides.get(path.stem),
        )
        (unfinished if got.get("skipped") else records).append(got)

    if unfinished:
        print(f"\n  {len(unfinished)} skipped, nothing written for them:")
        for rec in unfinished:
            print(f"    {rec['title'][:50]}  {rec['sourceCliSessionId']}")
            print(f"      {rec['skipped']}")

    write_manifest(run, "import", profile, records, scope=str(scope), skipped=unfinished)
    if not records:
        print("\nNothing was imported.")
        return 0

    print(f"\nImported {len(records)} conversation(s):\n")
    print(f"  {'TITLE':<44} {'TURNS':>5} {'AGENTS':>6}")
    for rec in records:
        print(f"  {rec['title'][:44]:<44} {rec['turns']:>5} {rec['subagentCount']:>6}")
        if rec["remap"]:
            print(f"      remap {rec['remap']}  ({rec['pathRewrites']} rewrites)")
            print(f"      copy  {rec['publishedTranscript']}")

    print("\nValidating:")
    ok = _validate(records)
    print(f"\nUndo this run:\n  claude-profiles undo {run}")
    return 0 if ok else 1

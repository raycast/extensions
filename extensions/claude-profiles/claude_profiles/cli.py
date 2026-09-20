"""Command-line entry point."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import Abort, __version__
from .commands import backup, importer, inspect_files, migrate, optimize, profiles, undo

EPILOG = """\
A profile is an isolated Claude Desktop login. `profile` manages them.

Session history is split in two: transcripts live in one shared store that
every profile reads, while each profile keeps its own index pointing at them.
A new profile therefore shows no sessions even though nothing was lost.
`import` builds index entries for CLI sessions; `migrate` copies an index
between profiles. Every writing command is reversible with `undo`.
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="claude-profiles",
        description="Isolated Claude Desktop profiles, and Claude Code history between them.",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="command", required=True, metavar="COMMAND")

    profile = sub.add_parser("profile", help="create, list, open and forget profiles")
    actions = profile.add_subparsers(dest="action", required=True, metavar="ACTION")

    add = actions.add_parser("add", help="create a profile")
    add.add_argument("name")
    add.add_argument("--data-dir", type=Path, help="reuse an existing data directory")
    add.add_argument("--no-open", dest="open", action="store_false", help="don't launch it")
    add.set_defaults(handler=profiles.run_add)

    actions.add_parser("list", help="list profiles").set_defaults(handler=profiles.run_list)

    opener = actions.add_parser("open", help="launch a profile")
    opener.add_argument("id")
    opener.set_defaults(handler=profiles.run_open)

    remove = actions.add_parser("rm", help="forget a profile")
    remove.add_argument("id")
    remove.add_argument("--purge", action="store_true", help="also delete its login and chats")
    remove.set_defaults(handler=profiles.run_remove)

    listing = sub.add_parser("list", help="list Claude Code CLI sessions")
    listing.add_argument("--profile", help="mark sessions this profile already has")
    listing.add_argument("--limit", type=int, default=20, help="rows to show (default 20)")
    listing.set_defaults(handler=importer.run_list)

    imp = sub.add_parser(
        "import",
        help="surface CLI sessions in a profile",
        description=importer.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    imp.add_argument("--to", required=True, help="destination profile id or data dir")
    imp.add_argument("--session", help="CLI session uuid, or a path to a .jsonl transcript")
    imp.add_argument("--limit", type=int, help="import the N most recent sessions not yet indexed")
    imp.add_argument(
        "--overwrite",
        action="append",
        default=[],
        metavar="ID",
        help="re-import a session the profile already has (repeatable). Replaces the "
        "existing entry when that entry is the same session; adds a second entry "
        "when a later session merely absorbed it.",
    )
    imp.add_argument("--template", type=Path, help="index entry to copy unrecognised fields from")
    imp.add_argument("--staging", type=Path, help="staging dir (default under XDG state)")
    imp.add_argument("--remap", metavar="OLD=NEW", help="rewrite this path in a republished copy")
    imp.add_argument(
        "--rewrite-content",
        action="store_true",
        help="with --remap, also rewrite paths inside message bodies and tool output",
    )
    imp.add_argument(
        "--allow-sidechain",
        action="store_true",
        help="permit importing a subagent sidechain (normally refused)",
    )
    imp.add_argument(
        "--allow-live",
        action="store_true",
        help="import a session still being written instead of skipping it. The entry "
        "describes the transcript as staged; the app reads it fresh, so later turns "
        "still appear.",
    )
    imp.add_argument(
        "--scratch-sessions",
        choices=("import", "skip", "relocate"),
        default="import",
        help="what to do with sessions that ran in a desktop scratch workspace "
        "(default: import them as they are)",
    )
    imp.add_argument(
        "--scratch-dir", type=Path, help="with --scratch-sessions relocate, the folder to point at"
    )
    imp.add_argument(
        "--exclude-rote-commands",
        action="store_true",
        help="skip sessions whose only content is built-in slash commands that read "
        "state or change Claude's own settings. Sessions with no user content at all "
        "are always skipped.",
    )
    imp.add_argument("--dry-run", action="store_true", help="print the plan and exit")
    imp.set_defaults(handler=importer.run_import)

    mig = sub.add_parser(
        "migrate",
        help="copy the session index between profiles",
        description=migrate.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mig.add_argument("--to", required=True, help="destination profile id or data dir")
    mig.add_argument("--from", dest="source", help="source profile (default: the default profile)")
    mig.add_argument("--staging", type=Path, help="staging dir (default under XDG state)")
    mig.add_argument("--dry-run", action="store_true", help="print the plan and exit")
    mig.add_argument("--yes", action="store_true", help="skip the confirmation prompt")
    mig.set_defaults(handler=migrate.run_migrate)

    back = sub.add_parser(
        "backup",
        help="snapshot profile session state",
        description=backup.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    back.add_argument("profiles", nargs="*", metavar="PROFILE", help="profile ids or data dirs")
    back.add_argument("--out", type=Path, help="where to write the snapshot")
    back.add_argument("--all", action="store_true", help="every profile on this machine")
    back.set_defaults(handler=backup.run_backup)

    opt = sub.add_parser(
        "optimize",
        help="clear stale state from index entries",
        description=optimize.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    opt.add_argument("--to", required=True, help="profile id or data dir")
    opt.add_argument("--clear-errors", action="store_true", help="drop stale error state")
    opt.add_argument("--clear-connectors", action="store_true", help="empty the connector cache")
    opt.add_argument(
        "--relocate-scratch", type=Path, metavar="DIR", help="repoint scratch-workspace entries"
    )
    opt.add_argument(
        "--include-app-written",
        action="store_true",
        help="also touch entries the app wrote, not just generated ones",
    )
    opt.add_argument(
        "--only", action="append", default=[], metavar="ID", help="limit to these ids (repeatable)"
    )
    opt.add_argument("--staging", type=Path, help="staging dir (default under XDG state)")
    opt.add_argument("--dry-run", action="store_true", help="print the plan and exit")
    opt.set_defaults(handler=optimize.run_optimize)

    rollback = sub.add_parser("undo", help="reverse a previous run")
    rollback.add_argument("run", nargs="?", type=Path, metavar="RUN", help="a run directory")
    rollback.add_argument("--last", action="store_true", help="the most recent run")
    rollback.add_argument("--list", action="store_true", help="list recorded runs")
    rollback.add_argument(
        "--only", action="append", default=[], metavar="ID", help="reverse just this record"
    )
    rollback.set_defaults(handler=undo.run_undo)

    insp = sub.add_parser(
        "inspect",
        help="print the shape of an index entry or a transcript",
        description=inspect_files.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    insp.add_argument("path", nargs="?", type=Path, help="a .json, .jsonl, or profile directory")
    insp.set_defaults(handler=inspect_files.run_inspect)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return int(args.handler(args))
    except Abort as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())

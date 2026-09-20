from __future__ import annotations

import json

import pytest
from conftest import (
    command_transcript,
    make_profile,
    make_transcript,
    read_entries,
    template_entry,
)

from claude_profiles.cli import main
from claude_profiles.index import walk_cwds
from claude_profiles.staging import runs
from claude_profiles.transcripts import find_transcript


@pytest.fixture
def profile():
    return make_profile(entries=[template_entry()])


def run(*argv: str) -> int:
    return main(list(argv))


def fails(capsys, match: str, *argv: str) -> None:
    """the CLI turns an Abort into exit 1 and a message on stderr."""
    assert run(*argv) == 1
    assert match in capsys.readouterr().err


def test_a_session_becomes_an_index_entry(profile, capsys):
    path = make_transcript(cwd="/work/app", title="Real work")
    assert run("import", "--to", str(profile), "--session", path.stem) == 0

    written = [e for e in read_entries(profile) if e["cliSessionId"] == path.stem]
    assert len(written) == 1
    entry = written[0]
    assert entry["title"] == "Real work"
    assert entry["cwd"] == "/work/app"
    assert entry["completedTurns"] == 2
    assert {v for _, v in walk_cwds(entry)} == {"/work/app"}
    assert "originals unchanged" in capsys.readouterr().out


def test_nothing_is_written_into_the_transcript_store(profile):
    path = make_transcript()
    before = path.read_bytes()
    run("import", "--to", str(profile), "--session", path.stem)
    assert path.read_bytes() == before


def test_permissions_are_resolved_not_inherited(profile):
    path = make_transcript()
    run("import", "--to", str(profile), "--session", path.stem)
    entry = next(e for e in read_entries(profile) if e["cliSessionId"] == path.stem)
    assert entry["permissionMode"] == "ask"
    assert entry["chromePermissionMode"] == "always_ask"
    assert entry["alwaysAllowedReasons"] == []
    assert "error" not in entry


def test_a_session_already_in_the_profile_is_not_re_imported(profile, capsys):
    path = make_transcript()
    run("import", "--to", str(profile), "--session", path.stem)
    before = len(read_entries(profile))

    assert run("import", "--to", str(profile), "--session", path.stem) == 0
    assert len(read_entries(profile)) == before
    assert "already in this profile" in capsys.readouterr().out


def test_overwrite_replaces_the_entry_for_the_same_session(profile):
    path = make_transcript()
    run("import", "--to", str(profile), "--session", path.stem)
    first = next(e for e in read_entries(profile) if e["cliSessionId"] == path.stem)

    run("import", "--to", str(profile), "--overwrite", path.stem)
    now = [e for e in read_entries(profile) if e["cliSessionId"] == path.stem]
    assert len(now) == 1
    assert now[0]["sessionId"] != first["sessionId"]


def test_overwrite_keeps_a_later_session_that_absorbed_this_one():
    absorbed = make_transcript(title="Earlier segment")
    profile = make_profile(
        entries=[
            template_entry(
                sessionId="local_new", cliSessionId="cli-new", priorCliSessionIds=[absorbed.stem]
            )
        ]
    )
    run("import", "--to", str(profile), "--overwrite", absorbed.stem)
    ids = {e["sessionId"] for e in read_entries(profile)}
    assert "local_new" in ids
    assert len(ids) == 2


def test_an_absorbed_session_is_skipped_when_its_successor_is_present():
    absorbed = make_transcript(title="Earlier segment")
    successor = make_transcript(title="Later session")
    profile = make_profile(
        entries=[
            template_entry(
                sessionId="local_new",
                cliSessionId=successor.stem,
                priorCliSessionIds=[absorbed.stem],
            )
        ]
    )
    run("import", "--to", str(profile), "--limit", "10")
    assert not [e for e in read_entries(profile) if e["cliSessionId"] == absorbed.stem]


def test_an_absorbed_session_is_kept_when_nothing_accounts_for_it(profile):
    absorbed = make_transcript(title="Orphaned segment")
    scope = profile / "claude-code-sessions" / "acct-0000" / "org-0000"
    make_profile(
        "other",
        entries=[
            template_entry(
                sessionId="local_x",
                cliSessionId="missing-successor",
                priorCliSessionIds=[absorbed.stem],
            )
        ],
    )
    run("import", "--to", str(profile), "--limit", "10")
    assert any(
        json.loads(p.read_text())["cliSessionId"] == absorbed.stem
        for p in scope.glob("local_*.json")
    )


def test_a_sidechain_is_refused(profile, capsys):
    parent = make_transcript(subagents=1)
    side = next((parent.parent / parent.stem / "subagents").glob("*.jsonl"))
    fails(capsys, "sidechain", "import", "--to", str(profile), "--session", str(side))


def test_a_session_with_no_user_content_is_refused(profile, capsys):
    path = make_transcript(title="Only tooling")
    path.write_text(
        json.dumps(
            {
                "type": "user",
                "cwd": "/w",
                "timestamp": "2026-01-01T00:00:00Z",
                "message": {"content": [{"type": "tool_result", "content": "x"}]},
            },
            separators=(",", ":"),
        )
        + "\n"
    )
    fails(capsys, "no user content", "import", "--to", str(profile), "--session", path.stem)


def test_rote_sessions_are_kept_by_default_and_skipped_on_request(profile):
    rote = command_transcript("/exit")
    run("import", "--to", str(profile), "--limit", "10")
    assert any(e["cliSessionId"] == rote.stem for e in read_entries(profile))

    other = make_profile("second", entries=[template_entry()])
    run("import", "--to", str(other), "--limit", "10", "--exclude-rote-commands")
    assert not any(e["cliSessionId"] == rote.stem for e in read_entries(other))


def test_scratch_sessions_can_be_skipped_or_relocated(profile, tmp_path):
    root = "/Users/x/Library/Application Support/Claude/scratch-workspaces"
    scratch = make_transcript(cwd=f"{root}/acct/org/scratch-2026-01-01-abc123")

    run("import", "--to", str(profile), "--limit", "10", "--scratch-sessions", "skip")
    assert not any(e["cliSessionId"] == scratch.stem for e in read_entries(profile))

    target = tmp_path / "scratch"
    run(
        "import",
        "--to",
        str(profile),
        "--limit",
        "10",
        "--scratch-sessions",
        "relocate",
        "--scratch-dir",
        str(target),
    )
    entry = next(e for e in read_entries(profile) if e["cliSessionId"] == scratch.stem)
    assert {v for _, v in walk_cwds(entry)} == {str(target)}


def test_relocate_needs_a_target_directory(profile, capsys):
    make_transcript()
    fails(
        capsys,
        "needs --scratch-dir",
        "import",
        "--to",
        str(profile),
        "--limit",
        "1",
        "--scratch-sessions",
        "relocate",
    )


def test_dry_run_writes_nothing(profile):
    make_transcript()
    before = len(read_entries(profile))
    assert run("import", "--to", str(profile), "--limit", "5", "--dry-run") == 0
    assert len(read_entries(profile)) == before
    assert not runs()


def test_import_refuses_a_profile_that_was_never_signed_in(tmp_path, capsys):
    make_transcript()
    (tmp_path / "empty").mkdir()
    fails(capsys, "sign in", "import", "--to", str(tmp_path / "empty"), "--limit", "1")


def test_import_needs_something_to_do(profile, capsys):
    fails(capsys, "--session", "import", "--to", str(profile))


def test_remap_publishes_a_copy_and_leaves_the_original(profile):
    path = make_transcript(cwd="/old/root", subagents=1)
    original = path.read_bytes()
    assert (
        run(
            "import", "--to", str(profile), "--session", path.stem, "--remap", "/old/root=/new/root"
        )
        == 0
    )

    entry = next(e for e in read_entries(profile) if e["cliSessionId"] != "template-cli-id")
    assert entry["cwd"] == "/new/root"
    published = find_transcript(entry["cliSessionId"])
    assert published is not None and published != path
    assert path.read_bytes() == original
    assert list((published.parent / published.stem / "subagents").glob("*.jsonl"))


def test_rewrite_content_alone_is_rejected(profile, capsys):
    make_transcript()
    fails(
        capsys,
        "only means something",
        "import",
        "--to",
        str(profile),
        "--limit",
        "1",
        "--rewrite-content",
    )


def test_remap_needs_both_sides(profile, capsys):
    make_transcript()
    fails(capsys, "OLD=NEW", "import", "--to", str(profile), "--limit", "1", "--remap", "/only-one")

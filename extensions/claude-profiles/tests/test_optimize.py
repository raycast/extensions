from __future__ import annotations

from conftest import make_profile, make_transcript, read_entries, template_entry

from claude_profiles.cli import main

SCRATCH = (
    "/Users/x/Library/Application Support/Claude/scratch-workspaces"
    "/acct/org/scratch-2026-01-01-abc123"
)


def run(*argv: str) -> int:
    return main(list(argv))


def imported_profile():
    """a profile holding one generated entry and one the app wrote."""
    profile = make_profile(entries=[template_entry()])
    run("import", "--to", str(profile), "--session", make_transcript().stem)
    return profile


def test_optimize_only_touches_generated_entries_by_default(capsys):
    profile = imported_profile()
    assert run("optimize", "--to", str(profile), "--clear-errors") == 0
    # the app-written template still carries its own real error
    assert any("error" in e for e in read_entries(profile))
    assert "1 generated" in capsys.readouterr().out


def test_optimize_clears_app_written_error_state_on_request():
    profile = imported_profile()
    run("optimize", "--to", str(profile), "--clear-errors", "--include-app-written")
    assert not any("error" in e for e in read_entries(profile))


def test_optimize_empties_the_connector_cache():
    profile = imported_profile()
    run("optimize", "--to", str(profile), "--clear-connectors", "--include-app-written")
    assert all(e["remoteMcpServersConfig"] == [] for e in read_entries(profile))


def test_optimize_repoints_a_scratch_entry(tmp_path):
    profile = make_profile(
        entries=[template_entry(sessionId="local_s", cwd=SCRATCH, originCwd=SCRATCH)]
    )
    target = tmp_path / "scratch"
    run(
        "optimize", "--to", str(profile), "--relocate-scratch", str(target), "--include-app-written"
    )
    entry = next(e for e in read_entries(profile) if e["sessionId"] == "local_s")
    assert entry["cwd"] == entry["originCwd"] == str(target)
    assert entry["promptAppendSnapshot"]["cwd"] == str(target)


def test_optimize_undo_restores_every_entry_it_changed():
    profile = imported_profile()
    before = read_entries(profile)
    run("optimize", "--to", str(profile), "--clear-errors", "--include-app-written")
    assert run("undo", "--last") == 0
    assert read_entries(profile) == before


def test_optimize_dry_run_writes_nothing(capsys):
    profile = imported_profile()
    before = read_entries(profile)
    assert (
        run(
            "optimize", "--to", str(profile), "--clear-errors", "--include-app-written", "--dry-run"
        )
        == 0
    )
    assert read_entries(profile) == before
    assert "nothing written" in capsys.readouterr().out


def test_optimize_needs_something_to_do(capsys):
    profile = make_profile(entries=[template_entry()])
    assert run("optimize", "--to", str(profile)) == 1
    assert "pick at least one" in capsys.readouterr().err


def test_optimize_reports_when_nothing_matches(capsys):
    profile = make_profile(entries=[template_entry(error=None)])
    del_entry = read_entries(profile)[0]
    assert "error" in del_entry
    assert run("optimize", "--to", str(profile), "--relocate-scratch", "/tmp/x") == 0
    assert "Nothing to change" in capsys.readouterr().out


def test_optimize_can_be_limited_to_one_entry():
    profile = make_profile(
        entries=[template_entry(sessionId="local_a"), template_entry(sessionId="local_b")]
    )
    run(
        "optimize",
        "--to",
        str(profile),
        "--clear-errors",
        "--include-app-written",
        "--only",
        "local_a",
    )
    by_id = {e["sessionId"]: e for e in read_entries(profile)}
    assert "error" not in by_id["local_a"]
    assert "error" in by_id["local_b"]


def test_optimize_reports_an_id_it_cannot_find(capsys):
    profile = make_profile(entries=[template_entry()])
    assert run("optimize", "--to", str(profile), "--clear-errors", "--only", "nope") == 1
    assert "no entries matched" in capsys.readouterr().err

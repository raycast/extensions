from __future__ import annotations

from conftest import make_profile, make_transcript, read_entries, template_entry

from claude_profiles.cli import main
from claude_profiles.staging import read_manifest, runs
from claude_profiles.transcripts import find_transcript


def run(*argv: str) -> int:
    return main(list(argv))


def test_undo_removes_what_an_import_created():
    profile = make_profile(entries=[template_entry()])
    path = make_transcript()
    run("import", "--to", str(profile), "--session", path.stem)
    assert any(e["cliSessionId"] == path.stem for e in read_entries(profile))

    assert run("undo", "--last") == 0
    assert not any(e["cliSessionId"] == path.stem for e in read_entries(profile))
    assert path.is_file()


def test_undo_restores_an_entry_that_overwrite_replaced():
    profile = make_profile(entries=[template_entry()])
    path = make_transcript()
    run("import", "--to", str(profile), "--session", path.stem)
    first = next(e for e in read_entries(profile) if e["cliSessionId"] == path.stem)

    run("import", "--to", str(profile), "--overwrite", path.stem)
    run("undo", "--last")

    now = [e for e in read_entries(profile) if e["cliSessionId"] == path.stem]
    assert [e["sessionId"] for e in now] == [first["sessionId"]]


def test_undo_deletes_a_republished_transcript_but_not_the_original():
    profile = make_profile(entries=[template_entry()])
    path = make_transcript(cwd="/old/root", subagents=1)
    run("import", "--to", str(profile), "--session", path.stem, "--remap", "/old/root=/new/root")
    entry = next(e for e in read_entries(profile) if e["cliSessionId"] != "template-cli-id")
    published = find_transcript(entry["cliSessionId"])

    run("undo", "--last")
    assert published is not None and not published.exists()
    assert not (published.parent / published.stem).exists()
    assert path.is_file()


def test_undo_can_reverse_one_record_and_keep_the_rest():
    profile = make_profile(entries=[template_entry()])
    first = make_transcript(title="First")
    second = make_transcript(title="Second")
    run("import", "--to", str(profile), "--limit", "10")

    run("undo", "--last", "--only", first.stem)
    kept = {e["cliSessionId"] for e in read_entries(profile)}
    assert second.stem in kept
    assert first.stem not in kept

    manifest = read_manifest(runs()[0])
    assert len(manifest["records"]) == 1
    assert len(manifest["undone"]) == 1


def test_undo_refuses_an_id_that_is_not_in_the_manifest(capsys):
    profile = make_profile(entries=[template_entry()])
    run("import", "--to", str(profile), "--session", make_transcript().stem)
    assert run("undo", "--last", "--only", "not-a-real-id") == 1
    assert "not in this manifest" in capsys.readouterr().err


def test_undo_lists_recorded_runs(capsys):
    profile = make_profile(entries=[template_entry()])
    run("import", "--to", str(profile), "--session", make_transcript().stem)
    assert run("undo", "--list") == 0
    assert "import" in capsys.readouterr().out


def test_undo_needs_a_target(capsys):
    assert run("undo") == 1
    assert "--last" in capsys.readouterr().err


def test_undo_reports_a_missing_manifest(tmp_path, capsys):
    assert run("undo", str(tmp_path)) == 1
    assert "no manifest.json" in capsys.readouterr().err

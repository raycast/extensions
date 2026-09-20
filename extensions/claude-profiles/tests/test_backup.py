from __future__ import annotations

from conftest import ACCOUNT, ORG, make_profile, template_entry

from claude_profiles.cli import main
from claude_profiles.paths import default_profile


def run(*argv: str) -> int:
    return main(list(argv))


def stocked(profile):
    """add the runtime and cache a real profile carries alongside its state."""
    for junk in ("claude-code/bin", "Cache/data", "local-agent-mode-sessions/skills-plugin/s"):
        path = profile / junk
        path.mkdir(parents=True, exist_ok=True)
        (path / "file").write_text("x" * 100)
    (profile / "config.json").write_text("{}")
    (profile / "local-agent-mode-sessions" / "kept.json").write_text("{}")
    return profile


def test_backup_keeps_session_state_and_drops_runtime(tmp_path):
    profile = stocked(make_profile(entries=[template_entry(sessionId="local_a")]))
    out = tmp_path / "snapshot"
    assert run("backup", str(profile), "--out", str(out)) == 0

    kept = out / "personal"
    assert (kept / "claude-code-sessions" / ACCOUNT / ORG / "local_a.json").is_file()
    assert (kept / "local-agent-mode-sessions" / "kept.json").is_file()
    assert (kept / "config.json").is_file()
    # runtime, caches and built-in skills are re-downloaded or rebuilt
    assert not (kept / "claude-code").exists()
    assert not (kept / "Cache").exists()
    assert not (kept / "local-agent-mode-sessions" / "skills-plugin").exists()


def test_backup_writes_a_manifest_naming_every_session(tmp_path):
    profile = make_profile(entries=[template_entry(sessionId="local_a")])
    out = tmp_path / "snapshot"
    run("backup", str(profile), "--out", str(out))
    manifest = (out / "MANIFEST.txt").read_text()
    assert "local_a.json" in manifest
    assert str(profile) in manifest
    assert "Sign in again rather than restoring auth" in manifest


def test_backup_all_labels_the_default_profile_separately(tmp_path):
    (default_profile() / "claude-code-sessions" / ACCOUNT / ORG).mkdir(parents=True)
    make_profile("personal")
    out = tmp_path / "snapshot"
    assert run("backup", "--all", "--out", str(out)) == 0
    assert (out / "default").is_dir()
    assert (out / "personal").is_dir()


def test_backup_rejects_mixing_all_with_names(tmp_path, capsys):
    profile = make_profile()
    assert run("backup", "--all", str(profile), "--out", str(tmp_path / "s")) == 1
    assert "takes no profile arguments" in capsys.readouterr().err


def test_backup_skips_a_path_that_is_not_a_profile(tmp_path, capsys):
    assert run("backup", str(tmp_path / "nope"), "--out", str(tmp_path / "s")) == 0
    assert "skip" in capsys.readouterr().out

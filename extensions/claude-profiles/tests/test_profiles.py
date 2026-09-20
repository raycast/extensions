from __future__ import annotations

from pathlib import Path

import pytest
from conftest import make_transcript, template_entry

from claude_profiles.cli import main
from claude_profiles.commands import profiles as cmd
from claude_profiles.paths import desktop_entries_dir, load_registry, profiles_root


@pytest.fixture(autouse=True)
def never_launch(monkeypatch):
    started: list[str] = []
    monkeypatch.setattr(cmd, "launch", lambda data_dir: started.append(str(data_dir)))
    return started


@pytest.fixture
def linux(monkeypatch):
    monkeypatch.setattr(cmd, "is_macos", lambda: False)


def run(*argv: str) -> int:
    return main(list(argv))


def test_add_creates_a_data_directory_and_registers_it(never_launch):
    assert run("profile", "add", "Work Laptop") == 0
    profile = load_registry()[0]
    assert profile.id == "work-laptop"
    assert profile.name == "Work Laptop"
    assert profile.path.is_dir()
    assert profile.path.parent == profiles_root()
    assert never_launch == [profile.dataDir]


def test_add_can_skip_launching():
    assert run("profile", "add", "Work", "--no-open") == 0
    assert load_registry()[0].id == "work"


def test_add_gives_a_repeated_name_its_own_directory():
    run("profile", "add", "Work", "--no-open")
    run("profile", "add", "Work", "--no-open")
    assert [p.id for p in load_registry()] == ["work", "work-2"]


def test_add_can_reuse_an_existing_data_directory(tmp_path):
    existing = tmp_path / "kept"
    existing.mkdir()
    run("profile", "add", "Work", "--no-open", "--data-dir", str(existing))
    assert load_registry()[0].path == existing


def test_add_rejects_an_empty_name(capsys):
    assert run("profile", "add", "   ", "--no-open") == 1
    assert "can't be empty" in capsys.readouterr().err


def test_list_marks_a_missing_data_directory(capsys):
    run("profile", "add", "Work", "--no-open")
    import shutil

    shutil.rmtree(load_registry()[0].path)
    run("profile", "list")
    assert "[missing]" in capsys.readouterr().out


def test_list_says_so_when_there_are_none(capsys):
    assert run("profile", "list") == 0
    assert "No profiles yet" in capsys.readouterr().out


def test_open_launches_by_id_or_name(never_launch):
    run("profile", "add", "Work", "--no-open")
    assert run("profile", "open", "work") == 0
    assert run("profile", "open", "Work") == 0
    assert len(never_launch) == 2


def test_open_reports_an_unknown_profile(capsys):
    assert run("profile", "open", "nope") == 1
    assert "no profile 'nope'" in capsys.readouterr().err


def test_rm_forgets_the_profile_but_keeps_its_data(capsys):
    run("profile", "add", "Work", "--no-open")
    data_dir = load_registry()[0].path
    assert run("profile", "rm", "work") == 0
    assert load_registry() == []
    assert data_dir.is_dir()
    assert "Re-add with" in capsys.readouterr().out


def test_rm_purge_deletes_the_data():
    run("profile", "add", "Work", "--no-open")
    data_dir = load_registry()[0].path
    run("profile", "rm", "work", "--purge")
    assert not data_dir.exists()


def test_linux_add_writes_a_desktop_launcher_and_a_badge(linux):
    run("profile", "add", "Work", "--no-open")
    entry = desktop_entries_dir() / "claude-profile-work.desktop"
    body = entry.read_text()
    assert "Name=Claude (Work)" in body
    assert f'Exec=claude-desktop "--user-data-dir={load_registry()[0].dataDir}"' in body
    assert "StartupWMClass=Claude" in body

    icon = next(line for line in body.splitlines() if line.startswith("Icon="))
    badge = icon.removeprefix("Icon=")
    assert ">W<" in Path(badge).read_text()


def test_linux_rm_removes_the_launcher(linux):
    run("profile", "add", "Work", "--no-open")
    entry = desktop_entries_dir() / "claude-profile-work.desktop"
    assert entry.is_file()
    run("profile", "rm", "work")
    assert not entry.exists()


def test_linux_launchers_cycle_through_the_palette(linux):
    for name in ("One", "Two"):
        run("profile", "add", name, "--no-open")
    colors = {
        cmd.badge_path(p.id).read_text().split('fill="')[1].split('"')[0] for p in load_registry()
    }
    assert len(colors) == 2


def test_a_registered_profile_can_be_named_instead_of_a_path(capsys):
    run("profile", "add", "Work", "--no-open")
    profile = load_registry()[0]
    scope = profile.path / "claude-code-sessions" / "acct-0000" / "org-0000"
    scope.mkdir(parents=True)
    import json

    (scope / "local_t.json").write_text(json.dumps(template_entry()))
    path = make_transcript()

    assert run("import", "--to", "work", "--session", path.stem) == 0
    assert "originals unchanged" in capsys.readouterr().out

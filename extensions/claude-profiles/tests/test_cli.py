from __future__ import annotations

import json

import pytest
from conftest import command_transcript, make_profile, make_transcript, template_entry

from claude_profiles.cli import build_parser, main
from claude_profiles.paths import default_profile


def run(*argv: str) -> int:
    return main(list(argv))


def test_every_leaf_subcommand_dispatches_to_a_handler():
    """a subparser with no handler would crash on use, not at build time."""

    def leaves(parser):
        groups = list(parser._subparsers._group_actions) if parser._subparsers else []
        if not groups:
            yield parser
            return
        for group in groups:
            for sub in group.choices.values():
                yield from leaves(sub)

    for parser in leaves(build_parser()):
        assert callable(parser.get_default("handler")), parser.prog


def test_help_names_the_storage_split(capsys):
    with pytest.raises(SystemExit):
        run("--help")
    assert "shared store" in capsys.readouterr().out


def test_a_missing_command_exits_two():
    with pytest.raises(SystemExit) as exit_info:
        run()
    assert exit_info.value.code == 2


def test_list_marks_what_the_profile_already_has(capsys):
    imported = make_transcript(title="Already there")
    make_transcript(title="Not yet")
    rote = command_transcript("/model")
    profile = make_profile(entries=[template_entry(cliSessionId=imported.stem)])

    assert run("list", "--profile", str(profile)) == 0
    out = capsys.readouterr().out
    assert f"* {imported.stem}" in out
    assert f"~ {rote.stem}" in out
    assert "already in the profile" in out
    assert "only built-in slash commands" in out


def test_list_works_without_a_profile(capsys):
    make_transcript(title="Solo")
    assert run("list") == 0
    assert "Solo" in capsys.readouterr().out


def test_list_ignores_an_unreadable_profile(capsys):
    make_transcript()
    assert run("list", "--profile", "/nowhere") == 0
    assert "sessions in" in capsys.readouterr().out


def test_list_counts_hidden_sidechains(capsys):
    make_transcript(subagents=2)
    run("list")
    assert "2 subagent sidechains hidden" in capsys.readouterr().out


def test_inspect_reports_an_index_entry(capsys):
    profile = make_profile(entries=[template_entry()])
    assert run("inspect", str(profile)) == 0
    out = capsys.readouterr().out
    assert "desktop session index" in out
    assert "promptAppendSnapshot" in out
    assert "dict keys=" in out


def test_inspect_reports_a_transcript(capsys):
    path = make_transcript(cwd="/work/app")
    assert run("inspect", str(path)) == 0
    out = capsys.readouterr().out
    assert "CLI transcript" in out
    assert "/work/app" in out
    assert "line types" in out


def test_inspect_defaults_to_the_default_profile(capsys):
    scope = default_profile() / "claude-code-sessions" / "acct-0000" / "org-0000"
    scope.mkdir(parents=True)
    (scope / "local_a.json").write_text(json.dumps(template_entry()))
    assert run("inspect") == 0
    assert "local_a.json" in capsys.readouterr().out


def test_inspect_rejects_an_unknown_file_type(tmp_path, capsys):
    odd = tmp_path / "notes.txt"
    odd.write_text("hi")
    assert run("inspect", str(odd)) == 1
    assert "unrecognised file type" in capsys.readouterr().err


def test_inspect_reports_an_empty_profile(tmp_path, capsys):
    assert run("inspect", str(tmp_path)) == 1
    assert "no local_*.json" in capsys.readouterr().err

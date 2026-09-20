from __future__ import annotations

from conftest import command_transcript, dump, make_transcript, user_turn

from claude_profiles import transcripts as tr
from claude_profiles.paths import cli_projects


def test_slug_for_collapses_separators_underscores_and_dots():
    assert tr.slug_for("/work/my_app.v2") == "-work-my-app-v2"


def test_to_millis_reads_iso_and_rejects_junk():
    assert tr.to_millis("2026-01-01T00:00:00.000Z") == 1767225600000
    assert tr.to_millis("not a time") is None


def test_message_text_ignores_tool_results_and_images():
    assert tr.message_text({"content": "plain"}) == "plain"
    assert tr.message_text({"content": [{"type": "text", "text": "said"}]}) == "said"
    assert tr.message_text({"content": [{"type": "tool_result", "content": "out"}]}) == ""
    assert tr.message_text(None) == ""


def test_classify_counts_real_turns_and_names_commands():
    stamp, sid = "2026-01-01T00:00:00Z", "s"
    lines = [
        dump(user_turn("do the thing", "/w", stamp, sid)),
        dump(user_turn("<command-name>/model</command-name>", "/w", stamp, sid)),
        dump(user_turn("<local-command-stdout>out</local-command-stdout>", "/w", stamp, sid)),
    ]
    turns, real, commands = tr.classify_content(lines, tr.parse_line)
    assert (turns, real, commands) == (3, 1, ["/model"])


def test_an_unrecognised_command_counts_as_real_content():
    line = dump(
        user_turn("<command-name>/my-custom</command-name>", "/w", "2026-01-01T00:00:00Z", "s")
    )
    _turns, real, commands = tr.classify_content([line], tr.parse_line)
    assert (real, commands) == (1, ["/my-custom"])


def test_sidechain_turns_never_count_as_user_content():
    line = user_turn("sub work", "/w", "2026-01-01T00:00:00Z", "s") | {"isSidechain": True}
    _turns, real, _commands = tr.classify_content([dump(line)], tr.parse_line)
    assert real == 0


def test_a_rote_only_session_is_marked_rote_not_empty():
    row = tr.summarize(command_transcript("/exit"))
    assert row["isRote"] and not row["isEmpty"]
    assert row["commands"] == ["/exit"]
    # the CLI records one command as three user turns, so turn count alone
    # would not have revealed this
    assert row["turns"] == 3


def test_a_session_with_no_user_content_is_marked_empty():
    path = make_transcript(title="Only tooling")
    # a tool result arrives as a user turn with no text block: activity, not
    # something the user said
    path.write_text(
        dump(
            {
                "type": "user",
                "cwd": "/w",
                "timestamp": "2026-01-01T00:00:00Z",
                "message": {"content": [{"type": "tool_result", "content": "out"}]},
            }
        )
        + "\n"
    )
    row = tr.summarize(path)
    assert row["isEmpty"] and not row["isRote"]
    assert row["turns"] == 1


def test_summarize_reports_title_cwd_and_subagents():
    path = make_transcript(cwd="/work/app", title="Named", subagents=2)
    row = tr.summarize(path)
    assert row["title"] == "Named"
    assert row["cwd"] == "/work/app"
    assert row["subagents"] == 2
    assert row["lastActivityAt"] > 0


def test_summarize_falls_back_to_the_folder_name():
    path = make_transcript(cwd="/work/fallback", title=None)
    assert tr.summarize(path)["title"] == "fallback"


def test_summarize_returns_nothing_for_an_empty_file():
    path = cli_projects() / "slug" / "empty.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("")
    assert tr.summarize(path) is None


def test_summarize_marks_a_scratch_workspace():
    root = "/Users/x/Library/Application Support/Claude/scratch-workspaces"
    path = make_transcript(cwd=f"{root}/acct/org/scratch-2026-01-01-abc123")
    assert tr.summarize(path)["isScratch"]


def test_derive_takes_the_launch_directory_not_the_most_common_one():
    path = make_transcript(cwd="/work/root")
    lines = tr.read_lines(path)
    deeper = dict(lines[-1], cwd="/work/root/sub")
    path.write_text("\n".join(dump(x) for x in [*lines, deeper, deeper]) + "\n")

    facts = tr.derive(tr.read_lines(path), path)
    assert facts["cwd"] == "/work/root"
    assert facts["originCwd"] == facts["cwd"]


def test_derive_reads_identity_from_the_filename_not_the_body():
    path = make_transcript(session_id="11111111-1111-1111-1111-111111111111")
    facts = tr.derive(tr.read_lines(path), path)
    assert facts["cliSessionId"] == path.stem
    assert facts["model"] == "claude-opus-5"
    assert facts["effort"] == "high"
    assert facts["completedTurns"] == 2


def test_derive_flags_a_sidechain_by_its_location():
    parent = make_transcript(subagents=1)
    side = next(tr.subagent_dir_for(parent).glob("*.jsonl"))
    assert tr.derive(tr.read_lines(side), side)["isSidechain"]
    assert not tr.derive(tr.read_lines(parent), parent)["isSidechain"]


def test_top_level_transcripts_excludes_sidechains():
    parent = make_transcript(subagents=2)
    assert tr.top_level_transcripts() == [parent]
    assert tr.subagent_count(parent) == 2


def test_find_transcript_accepts_an_id_or_a_path():
    path = make_transcript()
    assert tr.find_transcript(path.stem) == path
    assert tr.find_transcript(str(path)) == path
    assert tr.find_transcript("no-such-id") is None


def test_read_lines_skips_unparseable_lines():
    path = make_transcript()
    path.write_text(path.read_text() + "{broken\n\n")
    assert all(isinstance(line, dict) for line in tr.read_lines(path))

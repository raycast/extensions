from __future__ import annotations

import json
from collections import Counter

import pytest
from conftest import ACCOUNT, ORG, make_profile, template_entry, write_settings

from claude_profiles import Abort, index
from claude_profiles.paths import profiles_root


def test_session_scope_needs_a_signed_in_profile(tmp_path):
    with pytest.raises(Abort, match="claude-code-sessions"):
        index.session_scope(tmp_path)


def test_session_scope_refuses_to_guess_between_accounts():
    profile = make_profile()
    (profile / "claude-code-sessions" / "acct-1111" / "org-1111").mkdir(parents=True)
    with pytest.raises(Abort, match="2 accounts"):
        index.session_scope(profile)


def test_session_scope_finds_the_only_account():
    profile = make_profile()
    assert index.session_scope(profile) == (profile / "claude-code-sessions" / ACCOUNT / ORG)


def test_indexed_cli_map_counts_both_kinds_of_claim():
    profile = make_profile(
        entries=[
            template_entry(sessionId="local_a", cliSessionId="cli-a", priorCliSessionIds=[]),
            template_entry(
                sessionId="local_b", cliSessionId="cli-b", priorCliSessionIds=["cli-old"]
            ),
        ]
    )
    claims = index.indexed_cli_map(index.session_scope(profile))
    assert claims["cli-a"]["via"] == "cliSessionId"
    assert claims["cli-old"]["via"] == "priorCliSessionIds"
    assert claims["cli-old"]["sessionId"] == "local_b"


def test_a_direct_claim_beats_an_absorbed_one():
    profile = make_profile(
        entries=[
            template_entry(sessionId="local_a", cliSessionId="shared", priorCliSessionIds=[]),
            template_entry(
                sessionId="local_b", cliSessionId="cli-b", priorCliSessionIds=["shared"]
            ),
        ]
    )
    claims = index.indexed_cli_map(index.session_scope(profile))
    assert claims["shared"]["via"] == "cliSessionId"


def test_indexed_cli_map_skips_unreadable_entries():
    profile = make_profile(entries=[template_entry(sessionId="local_a", cliSessionId="cli-a")])
    scope = index.session_scope(profile)
    (scope / "local_broken.json").write_text("{oops")
    assert set(index.indexed_cli_map(scope)) >= {"cli-a"}


def test_lineage_is_learned_across_profiles():
    make_profile("one", entries=[template_entry(sessionId="local_a", cliSessionId="cli-a")])
    make_profile(
        "two",
        entries=[
            template_entry(
                sessionId="local_b", cliSessionId="cli-new", priorCliSessionIds=["cli-old"]
            )
        ],
    )
    lineage = index.lineage_map(index.all_session_scopes())
    assert lineage["cli-old"]["successor"] == "cli-new"


def test_load_template_prefers_the_newest_entry_and_skips_broken_ones():
    profile = make_profile(entries=[template_entry(sessionId="local_a")])
    scope = index.session_scope(profile)
    broken = scope / "local_zbroken.json"
    broken.write_text("{oops")
    import os
    import time

    os.utime(broken, (time.time() + 10, time.time() + 10))
    template, path = index.load_template(scope, None)
    assert path.name == "local_a.json"
    assert template["sessionId"] == "local_a"


def test_load_template_reports_when_there_is_nothing_to_copy_from():
    profile = make_profile()
    with pytest.raises(Abort, match="no usable local_"):
        index.load_template(index.session_scope(profile), None)


def test_retarget_cwd_reaches_nested_fields_only():
    before = {
        "cwd": "/old",
        "promptAppendSnapshot": {"cwd": "/old", "cliVersion": "2.0"},
        "notes": [{"originCwd": "/old", "text": "/old stays here"}],
    }
    hits: Counter[str] = Counter()
    after = index.retarget_cwd(before, "/new", hits)
    assert after["cwd"] == "/new"
    assert after["promptAppendSnapshot"]["cwd"] == "/new"
    assert after["promptAppendSnapshot"]["cliVersion"] == "2.0"
    assert after["notes"][0]["originCwd"] == "/new"
    assert after["notes"][0]["text"] == "/old stays here"
    assert sum(hits.values()) == 3


def test_walk_cwds_names_where_each_value_came_from():
    found = index.walk_cwds({"cwd": "/a", "snap": {"originCwd": "/b"}, "list": [{"cwd": "/c"}]})
    assert sorted(found) == [("cwd", "/a"), ("list[0].cwd", "/c"), ("snap.originCwd", "/b")]


def test_is_scratch_matches_only_the_app_computed_shape():
    root = "/Users/x/Library/Application Support/Claude/scratch-workspaces"
    assert index.is_scratch(f"{root}/acct/org/scratch-2026-01-01-abc123")
    assert not index.is_scratch("/work/scratch-workspaces-of-mine")
    assert not index.is_scratch(None)


def test_permissions_prefer_the_user_default():
    write_settings("acceptEdits")
    values, why = index.resolve_permissions()
    assert values["permissionMode"] == "acceptEdits"
    assert "user default" in why["permissionMode"]


def test_permissions_fall_back_conservatively():
    values, why = index.resolve_permissions()
    assert values == index.CONSERVATIVE
    assert "conservative" in why["permissionMode"]


FACTS = {
    "cwd": "/work/project",
    "originCwd": "/work/project",
    "createdAt": 100,
    "lastActivityAt": 200,
    "lastFocusedAt": 200,
    "title": "Real session",
    "model": "claude-opus-5",
    "effort": "high",
    "completedTurns": 4,
}


def test_build_entry_applies_the_field_policy():
    perms = {"permissionMode": "ask", "chromePermissionMode": "always_ask"}
    entry, tally = index.build_entry(template_entry(), FACTS, "cli-real", perms)

    assert entry["cliSessionId"] == "cli-real"
    assert entry["title"] == "Real session"
    assert entry["completedTurns"] == 4
    assert entry["sessionId"].startswith("local_")

    assert entry["permissionMode"] == "ask"
    assert entry["chromePermissionMode"] == "always_ask"

    assert entry["alwaysAllowedReasons"] == []
    assert entry["sessionPermissionUpdates"] == []
    assert entry["priorCliSessionIds"] == []
    assert entry["remoteMcpServersConfig"] == []

    assert "error" not in entry
    assert "errorAt" not in entry

    assert entry["aFutureFieldTheAppAdded"] == {"kept": True}

    assert all(value == "/work/project" for _, value in index.walk_cwds(entry))
    assert tally["RETARGETED"] == 1


def test_build_entry_does_not_mutate_the_template():
    template = template_entry()
    before = json.dumps(template, sort_keys=True)
    index.build_entry(template, FACTS, "cli-real", dict(index.CONSERVATIVE))
    assert json.dumps(template, sort_keys=True) == before


def test_build_entry_falls_back_to_the_template_model():
    facts = {**FACTS, "model": None, "effort": None}
    entry, _ = index.build_entry(template_entry(), facts, "cli-real", dict(index.CONSERVATIVE))
    assert entry["model"] == "claude-sonnet-5"
    assert entry["effort"] == "medium"


def test_build_entry_adds_neutral_fields_a_sparse_template_lacks():
    entry, _ = index.build_entry({"title": "x"}, FACTS, "cli-real", dict(index.CONSERVATIVE))
    assert entry["alwaysAllowedReasons"] == []
    assert entry["chromePermissionMode"] == "always_ask"


def test_entries_are_listed_in_a_stable_order():
    profile = make_profile(
        entries=[template_entry(sessionId=f"local_{n}") for n in ("c", "a", "b")]
    )
    names = [path.name for path, _ in index.entries(index.session_scope(profile))]
    assert names == ["local_a.json", "local_b.json", "local_c.json"]
    assert profiles_root() in profile.parents

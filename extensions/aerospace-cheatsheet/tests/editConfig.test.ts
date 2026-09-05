import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parse } from "smol-toml";
import { addBinding, findBindingLine, removeBinding, toTomlValue, updateBinding, verifyEdit } from "../src/lib/editConfig";

/** A config shaped like a real one: comments, blank lines, aligned columns, arrays. */
const CONFIG = `# ~/.aerospace.toml
config-version = 2
auto-reload-config = true

gaps.inner.horizontal = 8

[mode.main.binding]

    # --- Move focus ---
    ctrl-alt-left  = 'focus left'
    ctrl-alt-right = 'focus right'
    ctrl-alt-h     = 'focus left'

    ctrl-alt-c = 'layout --root h_tiles'   # ⌃⌥C  Columns
    ctrl-alt-r = 'layout --root v_tiles'   # ⌃⌥R  Rows

[mode.service.binding]
    esc = ['reload-config', 'mode main']
    r   = ['flatten-workspace-tree', 'mode main']

[[on-window-detected]]
    if.app-id = 'com.apple.finder'
    run = 'layout floating'
`;

describe("editConfig — locating", () => {
  it("finds a binding inside the right mode", () => {
    assert.notEqual(findBindingLine(CONFIG, "main", "ctrl-alt-c"), -1);
    assert.notEqual(findBindingLine(CONFIG, "service", "esc"), -1);
  });

  it("does not find a binding from a different mode", () => {
    assert.equal(findBindingLine(CONFIG, "main", "esc"), -1);
    assert.equal(findBindingLine(CONFIG, "service", "ctrl-alt-c"), -1);
  });

  it("does not match a key that merely shares a prefix", () => {
    // ctrl-alt-r must not match the line for ctrl-alt-right.
    const line = findBindingLine(CONFIG, "main", "ctrl-alt-r");
    assert.match(CONFIG.split("\n")[line], /layout --root v_tiles/);
  });

  it("stops at the section boundary", () => {
    assert.equal(findBindingLine(CONFIG, "main", "run"), -1, "leaked into [[on-window-detected]]");
  });
});

describe("editConfig — preserving the file", () => {
  it("changes only the one line it was asked to", () => {
    const { raw } = updateBinding(CONFIG, "main", "ctrl-alt-c", {
      key: "ctrl-alt-c",
      command: "layout --root v_tiles",
    });
    const before = CONFIG.split("\n");
    const after = raw.split("\n");
    assert.equal(before.length, after.length);
    const changed = before.map((l, i) => (l === after[i] ? null : i)).filter((i) => i !== null);
    assert.equal(changed.length, 1, `expected 1 changed line, got ${changed.length}`);
  });

  it("keeps the trailing comment and the column alignment", () => {
    const { raw } = updateBinding(CONFIG, "main", "ctrl-alt-c", {
      key: "ctrl-alt-c",
      command: "layout --root v_tiles",
    });
    const line = raw.split("\n").find((l) => l.includes("ctrl-alt-c")) ?? "";
    assert.match(line, /# ⌃⌥C {2}Columns$/, "trailing comment was lost");
    assert.match(line, /^ {4}ctrl-alt-c = /, "indentation or alignment changed");
  });

  it("keeps every comment in the file", () => {
    const comments = (text: string) => text.split("\n").filter((l) => l.includes("#")).length;
    const { raw } = updateBinding(CONFIG, "main", "ctrl-alt-left", {
      key: "ctrl-alt-left",
      command: "focus down",
    });
    assert.equal(comments(raw), comments(CONFIG));
  });

  it("preserves the alignment padding on a padded line", () => {
    const { raw } = updateBinding(CONFIG, "main", "ctrl-alt-left", {
      key: "ctrl-alt-left",
      command: "focus down",
    });
    assert.match(raw, /ctrl-alt-left {2}= 'focus down'/, "the two-space alignment was lost");
  });
});

describe("editConfig — values", () => {
  it("writes a single command as a string and a sequence as an array", () => {
    assert.equal(toTomlValue("focus left"), "'focus left'");
    assert.equal(toTomlValue("join-with left; mode main"), "['join-with left', 'mode main']");
  });

  it("round-trips an array binding without flattening it", () => {
    const { raw } = updateBinding(CONFIG, "service", "esc", {
      key: "esc",
      command: "reload-config; mode main",
    });
    const parsed = parse(raw) as never as { mode: { service: { binding: Record<string, unknown> } } };
    assert.deepEqual(parsed.mode.service.binding.esc, ["reload-config", "mode main"]);
  });

  it("switches quoting when the command contains an apostrophe", () => {
    assert.equal(toTomlValue("exec-and-forget echo it's"), '"exec-and-forget echo it\'s"');
    const { raw } = updateBinding(CONFIG, "main", "ctrl-alt-c", {
      key: "ctrl-alt-c",
      command: "exec-and-forget echo it's",
    });
    assert.doesNotThrow(() => parse(raw), "produced invalid TOML");
  });
});

describe("editConfig — add, remove, rebind", () => {
  it("adds a binding using the section's own indentation", () => {
    const { raw } = addBinding(CONFIG, "main", "ctrl-alt-b", "balance-sizes");
    assert.match(raw, /^ {4}ctrl-alt-b = 'balance-sizes'$/m);
    const parsed = parse(raw) as never as { mode: { main: { binding: Record<string, unknown> } } };
    assert.equal(parsed.mode.main.binding["ctrl-alt-b"], "balance-sizes");
  });

  it("refuses to add a key that is already bound", () => {
    assert.throws(() => addBinding(CONFIG, "main", "ctrl-alt-c", "fullscreen"), /already bound/);
  });

  it("creates the section when the mode has none", () => {
    const { raw } = addBinding(CONFIG, "resize", "h", "resize width -50");
    const parsed = parse(raw) as never as { mode: { resize: { binding: Record<string, unknown> } } };
    assert.equal(parsed.mode.resize.binding.h, "resize width -50");
    assert.doesNotThrow(() => parse(raw));
  });

  it("removes exactly one line", () => {
    const { raw } = removeBinding(CONFIG, "main", "ctrl-alt-c");
    assert.equal(raw.split("\n").length, CONFIG.split("\n").length - 1);
    assert.equal(findBindingLine(raw, "main", "ctrl-alt-c"), -1);
    assert.notEqual(findBindingLine(raw, "main", "ctrl-alt-r"), -1, "removed a neighbor too");
  });

  it("rebinds to a different key without touching the command", () => {
    const { raw } = updateBinding(CONFIG, "main", "ctrl-alt-c", {
      key: "ctrl-alt-shift-c",
      command: "layout --root h_tiles",
    });
    const parsed = parse(raw) as never as { mode: { main: { binding: Record<string, unknown> } } };
    assert.equal(parsed.mode.main.binding["ctrl-alt-shift-c"], "layout --root h_tiles");
    assert.equal(parsed.mode.main.binding["ctrl-alt-c"], undefined);
  });

  it("throws rather than silently doing nothing for a missing binding", () => {
    assert.throws(() => updateBinding(CONFIG, "main", "alt-nope", { key: "alt-nope", command: "x" }), /No binding/);
    assert.throws(() => removeBinding(CONFIG, "main", "alt-nope"), /No binding/);
  });
});

describe("editConfig — quoted table headers", () => {
  // [mode."main".binding] is valid TOML and parses to the same table as the bare form.
  // Matching only the bare form made editing impossible and made addBinding append a
  // second header, producing a file TOML rejects as a redefined table.
  const QUOTED = `[mode."main".binding]
    ctrl-alt-c = 'layout --root h_tiles'
    ctrl-alt-r = 'layout --root v_tiles'
`;

  it("finds a binding under a quoted mode segment", () => {
    assert.notEqual(findBindingLine(QUOTED, "main", "ctrl-alt-c"), -1);
  });

  it("edits it without throwing", () => {
    const { raw } = updateBinding(QUOTED, "main", "ctrl-alt-c", { key: "ctrl-alt-c", command: "fullscreen" });
    const parsed = parse(raw) as never as { mode: { main: { binding: Record<string, unknown> } } };
    assert.equal(parsed.mode.main.binding["ctrl-alt-c"], "fullscreen");
  });

  it("adds into the existing section rather than duplicating the header", () => {
    const { raw } = addBinding(QUOTED, "main", "ctrl-alt-b", "balance-sizes");
    assert.doesNotThrow(() => parse(raw), "produced a redefined-table document");
    const headers = raw.split("\n").filter((l) => /^\s*\[mode\./.test(l));
    assert.equal(headers.length, 1, `expected one mode header, got ${headers.length}`);
    const parsed = parse(raw) as never as { mode: { main: { binding: Record<string, unknown> } } };
    assert.equal(Object.keys(parsed.mode.main.binding).length, 3);
  });

  it("still distinguishes different modes when both are quoted", () => {
    const two = `[mode."main".binding]\n    a = 'focus left'\n\n[mode."service".binding]\n    b = 'focus right'\n`;
    assert.notEqual(findBindingLine(two, "main", "a"), -1);
    assert.equal(findBindingLine(two, "main", "b"), -1, "leaked across the section boundary");
    assert.notEqual(findBindingLine(two, "service", "b"), -1);
  });

  it("does not treat an array-of-tables header as a mode section", () => {
    const arr = `[[on-window-detected]]\n    run = 'layout floating'\n`;
    assert.equal(findBindingLine(arr, "main", "run"), -1);
  });
});

describe("editConfig — section headers with trailing comments", () => {
  // A header may carry a comment. Requiring the line to end at the closing bracket
  // made findSection miss the table, so editing reported the binding did not exist.
  const cases: [string, string][] = [
    ["space then comment", "[mode.main.binding] # keybindings"],
    ["comment, no space", "[mode.main.binding]# keybindings"],
    ["quoted mode and comment", '[mode."main".binding]   # keys'],
    ["trailing whitespace", "[mode.main.binding]   "],
  ];

  for (const [label, header] of cases) {
    it(`finds a binding under a header with ${label}`, () => {
      const toml = `${header}\n    ctrl-alt-c = 'fullscreen'\n`;
      assert.notEqual(findBindingLine(toml, "main", "ctrl-alt-c"), -1);
      const { raw } = updateBinding(toml, "main", "ctrl-alt-c", { key: "ctrl-alt-c", command: "balance-sizes" });
      assert.ok(raw.includes(header), "the header and its comment were not preserved");
      assert.doesNotThrow(() => parse(raw));
    });
  }

  it("does not mistake a hash inside a quoted key for a comment", () => {
    const toml = `[mode."a#b".binding]\n    ctrl-alt-c = 'fullscreen'\n`;
    assert.notEqual(findBindingLine(toml, "a#b", "ctrl-alt-c"), -1);
    assert.equal(findBindingLine(toml, "a", "ctrl-alt-c"), -1);
  });

  it("still ignores an array-of-tables header, with or without a comment", () => {
    assert.equal(findBindingLine(`[[on-window-detected]]\n    run = 'x'\n`, "main", "run"), -1);
    assert.equal(findBindingLine(`[[on-window-detected]] # float\n    run = 'x'\n`, "main", "run"), -1);
  });

  it("ends a section at the next commented header rather than running past it", () => {
    const toml = [
      "[mode.main.binding] # main keys",
      "    a = 'focus left'",
      "[mode.service.binding] # service keys",
      "    b = 'focus right'",
      "",
    ].join("\n");
    assert.equal(findBindingLine(toml, "main", "b"), -1, "leaked past the commented header");
    assert.notEqual(findBindingLine(toml, "service", "b"), -1);
  });
});

describe("editConfig — every spelling the format allows", () => {
  // Both P1s from review came from fixtures written in one canonical style. This is
  // the matrix of spellings TOML actually permits, so a config written by someone
  // else is covered rather than only a config written the way these tests were.
  const cases: [string, string][] = [
    ["literal string", "[mode.main.binding]\n    k = 'focus left'\n"],
    ["basic string", '[mode.main.binding]\n    k = "focus left"\n'],
    ["no spaces around equals", "[mode.main.binding]\n    k='focus left'\n"],
    ["extra spaces", "[mode.main.binding]\n    k    =    'focus left'\n"],
    ["tab indentation", "[mode.main.binding]\n\tk = 'focus left'\n"],
    ["no indentation", "[mode.main.binding]\nk = 'focus left'\n"],
    ["quoted key", '[mode.main.binding]\n    "k" = \'focus left\'\n'],
    ["single-quoted key", "[mode.main.binding]\n    'k' = 'focus left'\n"],
    ["CRLF endings", "[mode.main.binding]\r\n    k = 'focus left'\r\n"],
    ["single-line array", "[mode.main.binding]\n    k = ['focus left', 'mode main']\n"],
    ["multi-line array", "[mode.main.binding]\n    k = [\n      'focus left',\n      'mode main',\n    ]\n"],
    ["multi-line array with comment", "[mode.main.binding]\n    k = [\n      'focus left',\n    ]  # go left\n"],
    ["hash inside the value", "[mode.main.binding]\n    k = 'exec-and-forget echo #1'\n"],
    ["comment after value", "[mode.main.binding]\n    k = 'focus left'  # go left\n"],
    ["comment line above", "[mode.main.binding]\n    # focus\n    k = 'focus left'\n"],
    ["blank lines in section", "[mode.main.binding]\n\n\n    k = 'focus left'\n"],
    ["preamble before section", "config-version = 2\n\n[mode.main.binding]\n    k = 'focus left'\n"],
    ["quoted header and CRLF", '[mode."main".binding] # keys\r\n    k = \'focus left\'\r\n'],
  ];

  for (const [label, toml] of cases) {
    it(`edits a binding written with ${label}`, () => {
      assert.doesNotThrow(() => parse(toml), "the fixture itself is not valid TOML");
      assert.notEqual(findBindingLine(toml, "main", "k"), -1, "binding not found");

      const { raw } = updateBinding(toml, "main", "k", { key: "k", command: "fullscreen" });
      const parsed = parse(raw) as never as { mode: { main: { binding: Record<string, unknown> } } };
      assert.equal(parsed.mode.main.binding.k, "fullscreen");
    });

    it(`removes a binding written with ${label} without leaving orphans`, () => {
      const { raw } = removeBinding(toml, "main", "k");
      assert.doesNotThrow(() => parse(raw), "removal produced invalid TOML");
      assert.ok(!raw.includes("focus left"), "part of the value survived removal");
    });
  }

  it("preserves CRLF rather than rewriting the file to LF", () => {
    const toml = "[mode.main.binding]\r\n    k = 'focus left'\r\n";
    const { raw } = updateBinding(toml, "main", "k", { key: "k", command: "fullscreen" });
    assert.ok(raw.includes("\r\n"), "line endings were normalised, which would diff every line");
  });
});

describe("editConfig — verification gate", () => {
  it("accepts an edit that landed as intended", () => {
    const { raw } = updateBinding(CONFIG, "main", "ctrl-alt-c", { key: "ctrl-alt-c", command: "fullscreen" });
    assert.deepEqual(verifyEdit(raw, "main", "ctrl-alt-c", "fullscreen"), { ok: true });
  });

  it("rejects text that is not valid TOML", () => {
    const result = verifyEdit("[mode.main.binding\nbroken", "main", "x", "y");
    assert.equal(result.ok, false);
  });

  it("rejects an edit whose result does not match what was asked for", () => {
    const { raw } = updateBinding(CONFIG, "main", "ctrl-alt-c", { key: "ctrl-alt-c", command: "fullscreen" });
    const result = verifyEdit(raw, "main", "ctrl-alt-c", "balance-sizes");
    assert.equal(result.ok, false);
  });

  it("confirms a removal actually removed it", () => {
    const { raw } = removeBinding(CONFIG, "main", "ctrl-alt-c");
    assert.deepEqual(verifyEdit(raw, "main", "ctrl-alt-c", null), { ok: true });
    assert.equal(verifyEdit(CONFIG, "main", "ctrl-alt-c", null).ok, false);
  });
});

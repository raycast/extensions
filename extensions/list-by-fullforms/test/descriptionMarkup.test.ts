// Tests for the description markup helpers (lib/descriptionMarkup.ts):
// the callout catalog mirrored from the web's DescriptionEditor.vue
// SLASH_ITEMS, the append-as-block insert logic behind the forms'
// "Insert ... Callout" actions, and the mention token the Search rows'
// "Copy as Mention" action emits. The catalog block is a parity check
// against the web the same way listIconCatalog.test.ts pins its
// keyword table: if the web renames a callout or changes a prefix,
// this file is the tripwire to move the mirror in lockstep.

import { describe, expect, it } from "vitest";
import {
  CALLOUTS,
  appendCalloutPrefix,
  descriptionFieldInfo,
  mentionToken,
} from "../src/lib/descriptionMarkup";
import { shortcutHint } from "../src/lib/platform";

describe("CALLOUTS catalog", () => {
  it("mirrors the web's three callout slash items verbatim", () => {
    expect(CALLOUTS.map((c) => [c.name, c.prefix])).toEqual([
      ["Example", "> Example: "],
      ["Note", "> Note: "],
      ["Reference", "> Reference: "],
    ]);
  });

  it("uses prefixes the web's CALLOUT_OPENER_RE recognizes", () => {
    // Mirror of entryMentions.js CALLOUT_OPENER_RE: every prefix must
    // parse as a callout opener once content follows it, or the web
    // read view won't promote the inserted line to a chip.
    const openerRe = /^> (Examples?|Notes?|References?|Image): ?(.*)$/i;
    for (const c of CALLOUTS) {
      expect(`${c.prefix}some content`).toMatch(openerRe);
    }
  });

  it("assigns each callout a distinct insert-shortcut key", () => {
    const keys = CALLOUTS.map((c) => c.shortcutKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("appendCalloutPrefix", () => {
  const prefix = "> Example: ";

  it("returns the bare prefix on an empty description", () => {
    expect(appendCalloutPrefix("", prefix)).toBe(prefix);
  });

  it("treats a whitespace-only description as empty", () => {
    expect(appendCalloutPrefix("  \n\n ", prefix)).toBe(prefix);
  });

  it("appends as a blank-line-separated block", () => {
    expect(appendCalloutPrefix("Some text.", prefix)).toBe(
      `Some text.\n\n${prefix}`,
    );
  });

  it("normalizes trailing newlines instead of piling them up", () => {
    expect(appendCalloutPrefix("Some text.\n\n\n", prefix)).toBe(
      `Some text.\n\n${prefix}`,
    );
  });

  it("keeps consecutive callouts as separate blocks", () => {
    // A single-newline separator would merge `> a` and `> b` into one
    // markdown blockquote in the Search detail pane; the blank line is
    // what keeps a second insert visually distinct.
    const first = appendCalloutPrefix("", "> Example: ") + "GPS on a phone";
    const second = appendCalloutPrefix(first, "> Note: ");
    expect(second).toBe("> Example: GPS on a phone\n\n> Note: ");
  });
});

describe("mentionToken", () => {
  it("emits the web's plain-text mention shape", () => {
    expect(mentionToken("Deep Learning", 42)).toBe("[Deep Learning](#42)");
  });
});

describe("descriptionFieldInfo", () => {
  it("documents every callout prefix and the copy-as-mention shortcut", () => {
    const info = descriptionFieldInfo();
    for (const c of CALLOUTS) {
      expect(info).toContain(`"${c.prefix.trim()} "`);
    }
    // The hint must match the actual Copy as Mention binding
    // (Cmd+Shift+M via crossShortcut), rendered for the current OS.
    expect(info).toContain(shortcutHint(["cmd", "shift"], "m"));
  });
});

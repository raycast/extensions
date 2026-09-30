import { describe, expect, it } from "vitest";
import { buildQuickAddUri, collectVars } from "../src/uri";
import { Field } from "../src/types";

const field = (key: string, rawKey = key): Field => ({ key, rawKey, label: key, optional: false });

function decodeQuery(uri: string): [string, string][] {
  const query = uri.slice(uri.indexOf("?") + 1);
  return query.split("&").map((pair) => {
    const eq = pair.indexOf("=");
    return [decodeURIComponent(pair.slice(0, eq)), decodeURIComponent(pair.slice(eq + 1))];
  });
}

describe("buildQuickAddUri", () => {
  it("builds the basic capture URI", () => {
    expect(buildQuickAddUri("main-vault", "Thought", { value: "hi" })).toBe(
      "obsidian://quickadd?vault=main-vault&choice=Thought&value-value=hi",
    );
  });

  it("round-trips special characters in names, keys and values", () => {
    const value = "a+b & c=d #x 100% ?q привет 🙂\nline2";
    const uri = buildQuickAddUri("my vault", "Latin vocab & notes", { "Source?": value });
    expect(uri).not.toMatch(/[\s+#]/);
    expect(decodeQuery(uri)).toEqual([
      ["vault", "my vault"],
      ["choice", "Latin vocab & notes"],
      ["value-Source?", value],
    ]);
  });

  it("omits value params when there are no vars", () => {
    expect(buildQuickAddUri("v", "Quick note (brain dump)", {})).toBe(
      "obsidian://quickadd?vault=v&choice=Quick%20note%20(brain%20dump)",
    );
  });
});

describe("collectVars", () => {
  it("maps values to keys by position and sends the raw key too when it differs", () => {
    expect(collectVars([field("Title"), field("Source?", " Source?")], ["T", "S"])).toEqual({
      Title: "T",
      "Source?": "S",
      " Source?": "S",
    });
  });

  it("sends an empty string for a missing value so QuickAdd does not prompt", () => {
    expect(collectVars([field("value")], [])).toEqual({ value: "" });
  });
});

import { buildOpenUri, runsInBackground } from "../src/uri";
import { Choice } from "../src/types";

const choice = (over: Partial<Choice>): Choice => ({
  id: "i",
  name: "n",
  title: "n",
  type: "Capture",
  fields: [],
  notes: [],
  openFile: false,
  promptsInObsidian: false,
  ...over,
});

describe("runsInBackground", () => {
  it("runs quiet captures in the background and everything else in front", () => {
    expect(runsInBackground(choice({}))).toBe(true);
    expect(runsInBackground(choice({ promptsInObsidian: true }))).toBe(false);
    expect(runsInBackground(choice({ type: "Template" }))).toBe(false);
  });
});

describe("buildOpenUri", () => {
  it("opens a vault, or a file in it", () => {
    expect(buildOpenUri("my vault")).toBe("obsidian://open?vault=my%20vault");
    expect(buildOpenUri("v", "People/A & B.md")).toBe("obsidian://open?vault=v&file=People%2FA%20%26%20B.md");
  });
});

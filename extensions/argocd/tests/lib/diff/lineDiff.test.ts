import { describe, expect, it } from "vitest";
import {
  DiffTooLargeError,
  MAX_LINES,
  countChanges,
  diffLines,
  renderUnified,
  toHunks,
} from "../../../src/lib/diff/lineDiff";

const markers = (text: string) => diffLines(text.split("|")[0] ?? "", text.split("|")[1] ?? "");

describe("diffLines", () => {
  it("reports nothing for identical text", () => {
    const lines = diffLines("a\nb\nc", "a\nb\nc");
    expect(lines.every((line) => line.kind === "context")).toBe(true);
    expect(countChanges(lines)).toEqual({ added: 0, removed: 0 });
  });

  it("reports a changed line as a removal then an addition", () => {
    const lines = diffLines("a\nb\nc", "a\nB\nc");
    expect(lines.map((line) => `${line.kind[0]}${line.text}`)).toEqual(["ca", "rb", "aB", "cc"]);
  });

  it("reports an inserted line", () => {
    expect(countChanges(diffLines("a\nc", "a\nb\nc"))).toEqual({ added: 1, removed: 0 });
  });

  it("reports a deleted line", () => {
    expect(countChanges(diffLines("a\nb\nc", "a\nc"))).toEqual({ added: 0, removed: 1 });
  });

  it("treats the first argument as the live state and the second as the desired one", () => {
    // A `-` line is what the cluster has; a `+` line is what git asks for.
    const lines = diffLines("replicas: 1", "replicas: 2");
    expect(lines.find((line) => line.kind === "removed")?.text).toBe("replicas: 1");
    expect(lines.find((line) => line.kind === "added")?.text).toBe("replicas: 2");
  });

  it("handles one side being empty", () => {
    expect(countChanges(diffLines("", "a\nb"))).toEqual({ added: 2, removed: 0 });
    expect(countChanges(diffLines("a\nb", ""))).toEqual({ added: 0, removed: 2 });
    expect(diffLines("", "")).toEqual([]);
  });

  it("normalises line endings so a CRLF file does not diff as entirely changed", () => {
    expect(countChanges(diffLines("a\r\nb", "a\nb"))).toEqual({ added: 0, removed: 0 });
  });

  it("ignores a trailing newline difference", () => {
    expect(countChanges(diffLines("a\nb\n", "a\nb"))).toEqual({ added: 0, removed: 0 });
  });

  it("finds the longest common subsequence rather than the first alignment", () => {
    const lines = diffLines("a\nb\nc\nd\ne", "a\nx\nc\ny\ne");
    expect(countChanges(lines)).toEqual({ added: 2, removed: 2 });
    expect(lines.filter((line) => line.kind === "context").map((line) => line.text)).toEqual(["a", "c", "e"]);
  });

  it("handles a repeated line without losing alignment", () => {
    expect(countChanges(diffLines("a\na\na", "a\na"))).toEqual({ added: 0, removed: 1 });
  });

  it("refuses a diff beyond the line limit rather than freezing", () => {
    const huge = Array.from({ length: MAX_LINES }, (_, index) => `line ${index}`).join("\n");
    expect(() => diffLines(huge, `${huge}\nextra`)).toThrowError(DiffTooLargeError);
  });

  it("names the size in the refusal", () => {
    const huge = Array.from({ length: MAX_LINES + 1 }, () => "x").join("\n");
    try {
      diffLines(huge, huge);
    } catch (error) {
      expect((error as DiffTooLargeError).lines).toBeGreaterThan(MAX_LINES);
    }
    expect.assertions(1);
  });

  it("keeps a marker-free helper honest", () => {
    expect(markers("a\nb|a\nb").every((line) => line.kind === "context")).toBe(true);
  });
});

describe("toHunks", () => {
  const text = Array.from({ length: 40 }, (_, index) => `line ${index}`).join("\n");

  it("returns nothing when there is no change", () => {
    expect(toHunks(diffLines(text, text))).toEqual([]);
  });

  it("keeps only the neighbourhood of a change", () => {
    const changed = text.replace("line 20", "line twenty");
    const hunks = toHunks(diffLines(text, changed), 3);
    expect(hunks).toHaveLength(1);
    // Three lines of context each side, plus the removal and the addition.
    expect(hunks[0]?.lines).toHaveLength(8);
  });

  it("merges two nearby changes into one hunk", () => {
    const changed = text.replace("line 20", "x").replace("line 22", "y");
    expect(toHunks(diffLines(text, changed), 3)).toHaveLength(1);
  });

  it("keeps two distant changes as separate hunks", () => {
    const changed = text.replace("line 2", "x").replace("line 30", "y");
    expect(toHunks(diffLines(text, changed), 2)).toHaveLength(2);
  });

  it("reports 1-based start lines for each side", () => {
    const changed = text.replace("line 20", "line twenty");
    const hunk = toHunks(diffLines(text, changed), 3)[0];
    expect(hunk?.liveStart).toBe(18);
    expect(hunk?.targetStart).toBe(18);
  });

  it("clamps context at the start and the end of the file", () => {
    const changed = text.replace("line 0", "x").replace("line 39", "y");
    const hunks = toHunks(diffLines(text, changed), 5);
    expect(hunks[0]?.liveStart).toBe(1);
    expect(hunks.at(-1)?.lines.at(-1)?.kind).not.toBe("context");
  });
});

describe("renderUnified", () => {
  it("renders markers and a hunk header", () => {
    const rendered = renderUnified(toHunks(diffLines("a\nb\nc", "a\nB\nc"), 1));
    expect(rendered.split("\n")).toEqual(["@@ -1,3 +1,3 @@", " a", "-b", "+B", " c"]);
  });

  it("renders nothing for no hunks", () => {
    expect(renderUnified([])).toBe("");
  });

  it("marks an addition with + and a removal with -", () => {
    const rendered = renderUnified(toHunks(diffLines("a", "a\nb"), 1));
    expect(rendered).toContain("+b");
    expect(rendered).not.toContain("-b");
  });
});

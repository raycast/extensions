import { describe, expect, test } from "bun:test";
import { runFabric, stderrLines } from "../lib/runner";

// stderr written by /bin/sh, so the test controls exactly how it is chunked.
const sh = (script: string, onStderr?: (line: string) => void) =>
  runFabric("/bin/sh", ["-c", script], onStderr ? { onStderr } : {});

describe("ISC-89: onStderr gets each stderr line once, redacted per line", () => {
  test("a key split across two chunks reaches the callback as one redacted line", async () => {
    const script = 'printf "OPENAI_API_KEY=sk-liv" >&2; sleep 0.05; printf "esecret123 rejected\\n" >&2';
    const lines: string[] = [];
    const r = await sh(script, (l) => lines.push(l)).done;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("rejected");
    expect(lines[0]).not.toContain("livesecret123");
    expect(lines[0]).not.toContain("esecret123");
    // The callback changes nothing about the RunResult.
    const plain = await sh(script).done;
    expect(r.stderr).toBe(plain.stderr);
    expect(r.stderr).not.toContain("esecret123");
  });
});

describe("ISC-89.1: line boundaries, the trailing line and the error path", () => {
  test("a trailing line with no newline is delivered once, before done resolves", async () => {
    const lines: string[] = [];
    const seenAtDone = await sh('printf "first\\ntail" >&2', (l) => lines.push(l)).done.then(() => [...lines]);
    expect(seenAtDone).toEqual(["first", "tail"]);
    expect(lines).toEqual(["first", "tail"]);
  });

  test("several lines in one chunk give one callback each, in order; CRLF loses its CR", async () => {
    const lines: string[] = [];
    const r = await sh('printf "a\\nb\\r\\nc\\n" >&2', (l) => lines.push(l)).done;
    expect(lines).toEqual(["a", "b", "c"]);
    expect(r.stderr).toBe("a\nb\r\nc\n");
  });

  test('an empty line is delivered as ""', async () => {
    const lines: string[] = [];
    await sh('printf "a\\n\\nb\\n" >&2', (l) => lines.push(l)).done;
    expect(lines).toEqual(["a", "", "b"]);
  });

  test("a binary that cannot start resolves with an error and no callback", async () => {
    const lines: string[] = [];
    const r = await runFabric("/nonexistent/fabric", [], { onStderr: (l) => lines.push(l) }).done;
    expect(r.error).toContain("ENOENT");
    expect(lines).toEqual([]);
  });

  test("ending twice (error then close both finish a run) delivers the tail once", () => {
    const lines: string[] = [];
    const s = stderrLines((l) => lines.push(l));
    s.push("x\npart");
    s.end();
    s.end();
    expect(lines).toEqual(["x", "part"]);
  });
});

describe("stderrLines, driven directly (no reliance on the OS keeping two writes apart)", () => {
  test("a key split across two pushes is redacted as one line", () => {
    const got: string[] = [];
    const s = stderrLines((l) => got.push(l));
    s.push("OPENAI_API_KEY=sk-liv");
    expect(got).toEqual([]);
    s.push("esecret123 rejected\nnext");
    s.end();
    expect(got.length).toBe(2);
    expect(got[0]).toContain("rejected");
    expect(got[0]).not.toContain("esecret123");
    expect(got[1]).toBe("next");
  });
});

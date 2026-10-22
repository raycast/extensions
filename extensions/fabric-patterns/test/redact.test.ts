import { describe, expect, test } from "bun:test";
import { redact } from "../lib/redact";
import { runFabric } from "../lib/runner";

describe("redact stays linear on stderr it runs on every foreground run", () => {
  test("50 KB of letters with no key in it takes well under the time an unbounded label needs", () => {
    const letters = "a".repeat(50_000);
    const t0 = performance.now();
    expect(redact(letters)).toBe(letters);
    expect(performance.now() - t0).toBeLessThan(300); // unbounded: about 2 s here, 33 s at 200 KB
  });

  test("a label longer than the cap still has its value redacted", () => {
    const out = redact(`${"x".repeat(200)}_api_key=livesecret123 rest`);
    expect(out).not.toContain("livesecret123");
    expect(out).toEndWith("[REDACTED] rest");
  });
});

// runFabric redacts every RunResult's stderr, not only a failed one's (test/runner.test.ts has the
// failure case; this file joins mutation runs, which leave runner.test.ts out).
describe("runFabric's stderr is redacted whatever the outcome", () => {
  test("a run that succeeds, or is stopped, comes back redacted", async () => {
    const ok = await runFabric("/bin/sh", ["-c", "echo 'warn: api_key=livesecret123' >&2; exit 0"]).done;
    expect([ok.code, ok.stderr.includes("livesecret123")]).toEqual([0, false]);
    const h = runFabric("/bin/sh", ["-c", "echo 'token=livesecret456' >&2; sleep 30"], { killGraceMs: 200 });
    await Bun.sleep(150);
    h.abort();
    const stopped = await h.done;
    expect([stopped.aborted, stopped.stderr.includes("livesecret456")]).toEqual([true, false]);
  });
});

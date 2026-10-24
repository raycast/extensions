import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { primaryAction, resultMarkdown, shellCommand, statusLabel, statusOf, stoppedMessage } from "../lib/result";
import { runFabric } from "../lib/runner";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const tmp = mkdtempSync(join(tmpdir(), "fabric-result-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const env = (extra: Record<string, string> = {}) => ({ FAKE_FABRIC_LOG: join(tmp, "log"), ...extra });

describe("ISC-21: ↵ is Stop while running, Copy when done; a stop keeps the partial text", () => {
  test("↵ while running is Stop", () => {
    expect(primaryAction("running", "")).toBe("stop");
    expect(primaryAction("running", "half")).toBe("stop");
  });

  test("↵ after a finished run is Copy", async () => {
    const r = await runFabric(FAKE, [], { stdin: "x", env: env() }).done;
    expect(statusOf(r)).toBe("done");
    expect(primaryAction(statusOf(r), r.stdout)).toBe("copy");
  });

  test("a stopped run keeps its partial text, marked Stopped, and ↵ copies it", async () => {
    let seen = "";
    const h = runFabric(FAKE, [], {
      stdin: "x",
      env: env({ FAKE_FABRIC_CHUNKS: "50", FAKE_FABRIC_DELAY: "0.05" }),
      flushMs: 10,
      onText: (t) => (seen += t),
    });
    while (!seen.includes("chunk 2")) await Bun.sleep(10);
    h.abort();
    const r = await h.done;
    const status = statusOf(r);
    expect(status).toBe("stopped");
    expect(r.stdout).toContain("chunk 1");
    expect(r.stdout).not.toContain("chunk 50");
    const md = resultMarkdown(status, r.stdout, r);
    expect(md.startsWith(r.stdout)).toBe(true);
    expect(md).toContain("**Stopped.**");
    expect(primaryAction(status, r.stdout)).toBe("copy");
  });

  test("a failed run shows fabric's stderr, and an empty result offers nothing to copy", async () => {
    const r = await runFabric(FAKE, [], {
      stdin: "x",
      env: env({ FAKE_FABRIC_EXIT: "1", FAKE_FABRIC_STDERR: "pattern zzz not found" }),
    }).done;
    expect(statusOf(r)).toBe("failed");
    expect(resultMarkdown("failed", r.stdout, r)).toContain("pattern zzz not found");
    expect(primaryAction("failed", r.stdout)).toBe("none");
  });
});

describe("Result helpers", () => {
  // Reverting resultMarkdown's stopped branch or stoppedMessage to a plain `text ?` fails the "\n " case.
  test("a stop calls text a partial answer only when some arrived, in the view and the toast alike", () => {
    for (const empty of ["", "\n "]) {
      expect(resultMarkdown("stopped", empty)).toBe("**Stopped.** Nothing arrived before the stop.");
      expect(stoppedMessage(empty)).toBe("Nothing arrived before the stop.");
    }
    // The partial answer is shown as it arrived, trailing newline and all.
    expect(resultMarkdown("stopped", "half\n")).toBe("half\n\n\n---\n\n**Stopped.** This is the partial answer.");
    expect(stoppedMessage("half")).toBe("The partial answer stays here.");
  });

  test("status label formats elapsed time", () => {
    expect(statusLabel("running", 42)).toBe("Running 0:42");
    expect(statusLabel("done", 125)).toBe("Done in 2:05");
  });

  test("shell command quotes anything a shell would split or expand", () => {
    expect(shellCommand("/opt/homebrew/bin/fabric", ["--pattern=summarize", "--stream"])).toBe(
      "/opt/homebrew/bin/fabric --pattern=summarize --stream",
    );
    expect(shellCommand("/f", ["--variable=a:it's $(x)"])).toBe(`/f '--variable=a:it'\\''s $(x)'`);
  });
});

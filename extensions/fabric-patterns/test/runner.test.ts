import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildArgv, type RunSpec } from "../lib/argv";
import { type RunHandle, runFabric, stdinFor } from "../lib/runner";
import { REAL, RUN_REAL } from "./real-fabric";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const tmp = mkdtempSync(join(tmpdir(), "fabric-runner-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function fakeEnv(extra: Record<string, string> = {}) {
  return { ...process.env, FAKE_FABRIC_LOG: join(tmp, "log"), ...extra };
}

const REAL_DEADLINE_MS = 10_000;

describe("ISC-1: fabric runs from the Preferences path with Homebrew off PATH", () => {
  test.skipIf(!RUN_REAL)(
    "real fabric lists patterns with /opt/homebrew/bin removed",
    async () => {
      const PATH = (process.env.PATH ?? "")
        .split(":")
        .filter((p) => !p.startsWith("/opt/homebrew"))
        .join(":");
      // fabric answers in ~15 ms. Bun rarely drops a spawn's child events under load (a review traced
      // the old timeouts to that), so neither spawn's done can be trusted to settle: both race one
      // named deadline, and a lost event fails here by name instead of as a test timeout.
      let deadline: ReturnType<typeof setTimeout> | undefined;
      const expired = new Promise<"deadline">((r) => (deadline = setTimeout(() => r("deadline"), REAL_DEADLINE_MS)));
      const settle = async (what: string, h: RunHandle) => {
        const r = await Promise.race([h.done, expired]);
        if (r !== "deadline") return r;
        h.abort();
        throw new Error(`${what} did not settle within ${REAL_DEADLINE_MS / 1000} s`);
      };
      try {
        const seen = await settle(
          "the PATH probe",
          runFabric("/bin/sh", ["-c", 'printf %s "$PATH"'], { env: { PATH } }),
        );
        expect(seen.stdout).not.toContain("/opt/homebrew");
        const r = await settle(
          "fabric",
          runFabric(REAL, ["--listpatterns", "--shell-complete-list"], { env: { PATH } }),
        );
        expect(r.code === 0 ? 0 : `fabric exited ${r.code}; stderr: ${r.stderr}`).toBe(0);
        expect(r.stdout.split("\n").filter(Boolean).length).toBeGreaterThan(0);
      } finally {
        clearTimeout(deadline);
      }
    },
    REAL_DEADLINE_MS + 5_000,
  );

  test("a relative fabric path is refused", () => {
    expect(() => runFabric("fabric", [])).toThrow();
  });

  // fabric run without HOME writes fabric/locales and .config/fabric/extensions into its working
  // folder (probed 2026-10-20); that is how both once landed in this repo (ISC-95).
  test("an env passed in is layered over process.env: HOME survives and the caller's PATH wins", async () => {
    expect(process.env.HOME).toBeTruthy();
    expect(process.env.PATH).not.toBe("/usr/bin:/bin");
    const r = await runFabric("/bin/sh", ["-c", 'printf "%s|%s" "$HOME" "$PATH"'], { env: { PATH: "/usr/bin:/bin" } })
      .done;
    expect(r.stdout).toBe(`${process.env.HOME}|/usr/bin:/bin`);
  });

  test("a missing binary resolves with an error, not a crash", async () => {
    const r = await runFabric(join(tmp, "nope"), []).done;
    expect(r.code).toBeNull();
    expect(r.error).toMatch(/ENOENT/);
  });
});

describe("ISC-3: every spawn closes or feeds stdin", () => {
  const kinds: RunSpec["input"][] = [
    { kind: "none" },
    { kind: "youtube", url: "https://youtu.be/x" },
    { kind: "url", url: "https://example.com" },
    { kind: "image", path: "/tmp/x.png" },
    { kind: "media", path: "/tmp/x.m4a" },
    { kind: "text", text: "piped" },
  ];
  for (const input of kinds) {
    test(`${input.kind} input does not hang`, async () => {
      const r = await runFabric(FAKE, buildArgv({ input }), { stdin: stdinFor(input), env: fakeEnv() }).done;
      expect(r.code).toBe(0);
    }, 5000);
  }

  test("text input arrives on stdin", async () => {
    const log = join(tmp, "stdin-log");
    await runFabric(FAKE, [], { stdin: "piped text", env: fakeEnv({ FAKE_FABRIC_LOG: log }) }).done;
    expect(readFileSync(log, "utf8")).toContain("--stdin--\npiped text");
  });

  test("only text input is piped", () => {
    expect(stdinFor({ kind: "text", text: "x" })).toBe("x");
    expect(stdinFor({ kind: "youtube", url: "https://youtu.be/x" })).toBeUndefined();
  });
});

describe("ISC-2: no input text can execute a shell command", () => {
  const evil = [
    `$(touch ${join(tmp, "pwned1")})`,
    `\`touch ${join(tmp, "pwned2")}\``,
    `x; touch ${join(tmp, "pwned3")}`,
  ];

  test("evil text in stdin, variable values and model runs nothing", async () => {
    for (const e of evil) {
      const argv = buildArgv({ input: { kind: "text", text: e }, variables: { v: e }, model: e });
      await runFabric(FAKE, argv, { stdin: e, env: fakeEnv() }).done;
    }
    for (const n of ["pwned1", "pwned2", "pwned3"]) expect(existsSync(join(tmp, n))).toBe(false);
  });

  test("the evil strings reach fabric verbatim as argv", async () => {
    const log = join(tmp, "argv-log");
    await runFabric(FAKE, buildArgv({ input: { kind: "none" }, variables: { v: evil[0] } }), {
      env: fakeEnv({ FAKE_FABRIC_LOG: log }),
    }).done;
    expect(readFileSync(log, "utf8")).toContain(`--variable=v:${evil[0]}`);
  });
});

describe("streaming", () => {
  test("chunks arrive in batches and the tail is flushed on close", async () => {
    const seen: string[] = [];
    const r = await runFabric(FAKE, [], {
      env: fakeEnv({ FAKE_FABRIC_CHUNKS: "5", FAKE_FABRIC_DELAY: "0.05" }),
      onText: (t) => seen.push(t),
      flushMs: 20,
    }).done;
    expect(seen.length).toBeGreaterThan(1);
    expect(seen.join("")).toBe(r.stdout);
    expect(r.stdout).toBe("chunk 1\nchunk 2\nchunk 3\nchunk 4\nchunk 5\n");
  });

  test("abort kills the child and keeps the partial text", async () => {
    const seen: string[] = [];
    const h = runFabric(FAKE, [], {
      env: fakeEnv({ FAKE_FABRIC_CHUNKS: "50", FAKE_FABRIC_DELAY: "0.05" }),
      onText: (t) => seen.push(t),
      flushMs: 20,
    });
    await Bun.sleep(300);
    h.abort();
    const r = await h.done;
    expect(r.aborted).toBe(true);
    expect(r.stdout).toMatch(/^chunk 1\n/);
    expect(r.stdout).not.toContain("chunk 50");
    expect(seen.join("")).toBe(r.stdout);
  }, 5000);

  test("the 'Creating new session' banner is stripped", async () => {
    const r = await runFabric("/bin/sh", ["-c", "printf 'Creating new session: s1\\nanswer\\n'"]).done;
    expect(r.stdout).toBe("answer\n");
  });

  test("output that only looks like the banner later is kept", async () => {
    const r = await runFabric("/bin/sh", ["-c", "printf 'answer\\nCreating new session: s1\\n'"]).done;
    expect(r.stdout).toBe("answer\nCreating new session: s1\n");
  });

  test("non-zero exit and stderr are reported", async () => {
    const r = await runFabric(FAKE, [], {
      env: fakeEnv({ FAKE_FABRIC_EXIT: "1", FAKE_FABRIC_STDERR: "pattern x not found" }),
    }).done;
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("pattern x not found");
  });
});

// Result, the Download toast and the list states all show or copy stderr; runFabric redacts it once.
describe("stderr comes back redacted", () => {
  test("a key or token fabric prints on stderr never reaches the RunResult", async () => {
    const r = await runFabric("/bin/sh", [
      "-c",
      "echo 'OPENAI_API_KEY=sk-livesecret123 rejected' >&2; echo 'Authorization: Bearer tok_abc999' >&2; exit 1",
    ]).done;
    expect(r.stderr).toContain("rejected");
    expect(r.stderr).not.toContain("livesecret123");
    expect(r.stderr).not.toContain("tok_abc999");
  });
});

import { describe, expect, it } from "vitest";
import { checkMarkdown, killSummary, parsePort, rows, stoppable } from "./model";
import { candidates, check, type Exec, free, kill, list, PortcheckError, resolveBinary, run } from "./portcheck";

const node = {
  proto: "tcp",
  localAddress: "127.0.0.1",
  localPort: 3000,
  pid: 42,
  process: {
    pid: 42,
    name: "node",
    user: "alice",
    cmdline: "node server.js",
    ancestors: [
      { pid: 7, name: "npm" },
      { pid: 3, name: "zsh" },
    ],
  },
};
const web = {
  proto: "tcp",
  localAddress: "0.0.0.0",
  localPort: 8080,
  pid: 9,
  container: { name: "web", runtime: "docker", stopHint: "docker stop web" },
};
const hidden = { proto: "tcp", localAddress: "0.0.0.0", localPort: 22 };

function fake(stdout: string, code = 0, stderr = ""): Exec & { args: string[][] } {
  const calls: string[][] = [];
  const f = (async (_file: string, args: string[]) => {
    calls.push(args);
    return { stdout, stderr, code };
  }) as Exec & { args: string[][] };
  f.args = calls;
  return f;
}
const env = (kind: string, data: unknown) => JSON.stringify({ schemaVersion: 1, kind, data });

describe("finding portcheck", () => {
  it("prefers the preference, then the usual install locations", () => {
    expect(resolveBinary(" /opt/pc ")).toBe("/opt/pc");
    expect(resolveBinary("", (p) => p === "/usr/local/bin/portcheck")).toBe("/usr/local/bin/portcheck");
    expect(candidates("/h", "/a:/b")).toEqual([
      "/opt/homebrew/bin/portcheck",
      "/usr/local/bin/portcheck",
      "/h/.local/bin/portcheck",
      "/h/go/bin/portcheck",
      "/a/portcheck",
      "/b/portcheck",
    ]);
    expect(candidates("/h", undefined)).toHaveLength(4);
  });

  it("explains how to install it when it's missing", () => {
    try {
      resolveBinary(undefined, () => false);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(PortcheckError);
      expect((e as PortcheckError).missing).toBe(true);
      expect((e as Error).message).toContain("brew install roystondwork-dev/tap/portcheck");
    }
  });
});

describe("running portcheck", () => {
  it("passes the right arguments and accepts answer codes", async () => {
    const l = fake(env("list", { sockets: [node], partial: false }));
    expect((await list("pc", l)).sockets).toHaveLength(1);
    expect(l.args).toEqual([["list", "--listening", "--json"]]);
    const c = fake(env("check", { ports: [] }), 1);
    await check("pc", 3000, c);
    expect(c.args).toEqual([["check", "3000", "--json"]]);
    const f = fake(env("free", { ports: [3001] }));
    expect((await free("pc", "3000-3999", f)).ports).toEqual([3001]);
    await free("pc", undefined, f);
    expect(f.args[1]).toEqual(["free", "--json"]);
    const k = fake(env("kill", { results: [] }), 3);
    await kill("pc", 42, k);
    expect(k.args).toEqual([["kill", "--pid", "42", "--yes", "--json"]]);
  });

  it("reports failures clearly", async () => {
    await expect(
      run("pc", "list", [], [0], fake("", 2, "\nportcheck: unknown flag --x\nRun 'portcheck --help'")),
    ).rejects.toThrow("unknown flag --x");
    await expect(run("pc", "list", [], [0], fake("", 3))).rejects.toThrow("portcheck exited with status 3");
    await expect(run("pc", "list", [], [0], fake("{oops"))).rejects.toThrow('invalid JSON for "list"');
    await expect(run("pc", "list", [], [0], fake(env("check", {})))).rejects.toThrow("kind check");
  });
});

describe("rows", () => {
  it("are unique, sorted and describe the holder", () => {
    const r = rows({ sockets: [web, node, node, hidden], partial: false });
    expect(r.map((x) => [x.port, x.name, x.pid])).toEqual([
      [22, "(hidden)", undefined],
      [3000, "node", 42],
      [8080, "docker:web", undefined],
    ]);
    expect(r[1]).toMatchObject({
      user: "alice",
      startedBy: "npm (7) ← zsh (3)",
      url: "http://localhost:3000/",
      cmdline: "node server.js",
    });
    expect(r[2].stopHint).toBe("docker stop web");
    expect(
      rows({
        sockets: [{ ...web, container: { runtime: "podman", image: "redis", stopHint: "x" } }],
        partial: false,
      })[0].name,
    ).toBe("podman:redis");
    expect(
      rows({ sockets: [{ ...web, container: { runtime: "docker", id: "abc", stopHint: "x" } }], partial: false })[0]
        .name,
    ).toBe("docker:abc");
    expect(
      rows({ sockets: [{ ...web, container: { runtime: "docker", stopHint: "x" } }], partial: false })[0].name,
    ).toBe("docker:?");
    expect(
      rows({ sockets: [{ proto: "udp", localAddress: "::", localPort: 5353, pid: 1 }], partial: false })[0].name,
    ).toBe("?");
  });
});

describe("check reports", () => {
  const busy = { ports: [{ port: 3000, proto: "tcp", status: "in-use" as const, holders: [node, node] }] };
  it("names the holder and what can be stopped", () => {
    const md = checkMarkdown(3000, busy);
    expect(md).toContain("# Port 3000 is in use");
    expect(md).toContain("## node (pid 42)");
    expect(md).toContain("**Started by:** npm (7) ← zsh (3)");
    expect(md).toContain("`node server.js`");
    expect(stoppable(3000, busy)).toEqual([{ pid: 42, name: "node" }]);
  });
  it("covers free, denied, containers and hidden owners", () => {
    expect(checkMarkdown(3000, { ports: [] })).toContain("is free");
    expect(checkMarkdown(80, { ports: [{ port: 80, proto: "tcp", status: "denied", holders: [] }] })).toContain(
      "can't be used",
    );
    const other = {
      ports: [
        {
          port: 8080,
          proto: "tcp",
          status: "in-use" as const,
          holders: [web, hidden, { ...node, process: undefined }],
        },
      ],
    };
    const md = checkMarkdown(8080, other);
    expect(md).toContain("`docker stop web`");
    expect(md).toContain("sudo portcheck kill 8080");
    expect(stoppable(8080, other)).toEqual([{ pid: 42, name: "process" }]);
    expect(stoppable(9, { ports: [] })).toEqual([]);
  });
});

describe("kill summaries and ports", () => {
  it("say what happened", () => {
    expect(killSummary({ results: [{ pid: 42, name: "node", outcome: "terminated" }] })).toEqual({
      ok: true,
      text: "node (pid 42): terminated",
    });
    expect(
      killSummary({
        results: [
          { pid: 1, outcome: "failed", error: "protected" },
          { pid: 2, outcome: "failed" },
        ],
      }),
    ).toEqual({
      ok: false,
      text: "process (pid 1): not stopped: protected; process (pid 2): not stopped: unknown error",
    });
    expect(killSummary({ results: [] })).toEqual({ ok: false, text: "nothing to stop" });
  });
  it("parse port arguments", () => {
    expect(parsePort(" 3000 ")).toBe(3000);
    expect(parsePort(":8080")).toBe(8080);
    for (const bad of ["", "0", "70000", "3.5", "abc"]) expect(parsePort(bad)).toBeUndefined();
  });
});

describe("real processes", () => {
  it("runs a program and passes its exit code", async () => {
    const out = env("check", { ports: [] });
    // sh -c <script> <$0> --json: the script ignores its arguments.
    await expect(run("/bin/sh", "check", ["-c", `echo '${out}'; exit 1`, "sh"], [0, 1])).resolves.toEqual({
      ports: [],
    });
    await expect(run("/bin/sh", "check", ["-c", "echo nope >&2; exit 5", "sh"])).rejects.toThrow("nope");
  });
  it("reports a binary that can't be started", async () => {
    await expect(run("/nonexistent/portcheck", "list", [])).rejects.toMatchObject({ missing: true });
  });
});

// PORTCHECK_BIN=<path to portcheck>: the real CLI, holding a port from this test.
describe.skipIf(!process.env.PORTCHECK_BIN)("real portcheck", () => {
  it("lists, checks and describes a held port", async () => {
    const { createServer } = await import("node:net");
    const server = createServer().listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const port = (server.address() as { port: number }).port;
    try {
      const bin = process.env.PORTCHECK_BIN!;
      const row = rows(await list(bin)).find((r) => r.port === port);
      expect(row).toMatchObject({ pid: process.pid, proto: "tcp" });
      const data = await check(bin, port);
      expect(stoppable(port, data)).toEqual([{ pid: process.pid, name: row!.name }]);
      expect(checkMarkdown(port, data)).toContain(`# Port ${port} is in use`);
      expect((await free(bin, "40000-40100")).ports).toHaveLength(1);
    } finally {
      server.close();
    }
  });
});

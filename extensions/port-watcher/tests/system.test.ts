import { describe, it, expect, afterEach } from "vitest";
import { spawn, type ChildProcess } from "child_process";
import { mkdtempSync } from "fs";
import { join } from "path";
import {
  ancestry,
  classify,
  fetchStartTimes,
  isExposed,
  killListener,
  killVerdict,
  launchedBy,
  parseCwdOutput,
  parseLaunchMarks,
  parseLsofOutput,
  parsePidRest,
  parseProcessTree,
  readListeningPorts,
  waitForExit,
  type ListeningPort,
} from "../src/system";
import { canonicalCwd } from "../src/profiles";

/* ─── Who started this ─── */

describe("parseProcessTree", () => {
  it("reads pid, parent and name from ps -axo", () => {
    const raw = ["  620     1 /usr/libexec/rapportd", "13358 13336 node", ""].join("\n");
    expect(parseProcessTree(raw)).toEqual(
      new Map([
        ["620", { ppid: "1", comm: "rapportd" }],
        ["13358", { ppid: "13336", comm: "node" }],
      ]),
    );
  });

  it("keeps the last path segment — the name you would recognize", () => {
    const raw = "4625     1 /Applications/Claude.app/Contents/MacOS/Claude\n";
    expect(parseProcessTree(raw).get("4625")?.comm).toBe("Claude");
  });

  it("keeps the spaces inside a name", () => {
    expect(parseProcessTree("20718     1 Raycast Beta\n").get("20718")?.comm).toBe("Raycast Beta");
  });

  it("skips blanks and lines that are not a process", () => {
    expect(parseProcessTree("\nnot a process\n  620     1   \n")).toEqual(new Map());
  });
});

describe("ancestry", () => {
  // The real shape, measured on this machine: three of the node servers in the
  // list were spun up by Claude and looked exactly like the ones I started.
  //
  // launchd is in here because `ps -axo` really does report it (pid 1, ppid 0).
  // Leaving it out made the walk stop for want of finding it rather than because
  // the code stops below it — the tests below then passed with the guard removed,
  // which a mutation run duly proved.
  const tree = new Map([
    ["13358", { ppid: "13336", comm: "node" }],
    ["13336", { ppid: "13335", comm: "npm run dev" }],
    ["13335", { ppid: "4625", comm: "disclaimer" }],
    ["4625", { ppid: "1", comm: "Claude" }],
    ["643", { ppid: "1", comm: "rapportd" }],
    ["999", { ppid: "998", comm: "orphan" }],
    ["1", { ppid: "0", comm: "launchd" }],
  ]);

  it("walks from the process up to the app that owns the session", () => {
    expect(ancestry("13358", tree)).toEqual(["node", "npm run dev", "disclaimer", "Claude"]);
  });

  it("stops below launchd — the parent of everything says nothing about anyone", () => {
    expect(ancestry("13358", tree)).not.toContain("launchd");
  });

  // A daemon is a child of launchd, which "system" already says. Naming a
  // process as its own launcher would be noise.
  it("says nothing about a process launchd started itself", () => {
    expect(ancestry("643", tree)).toEqual([]);
  });

  it("says nothing about a pid it cannot find", () => {
    expect(ancestry("404", tree)).toEqual([]);
  });

  it("stops rather than hang when a parent is missing mid-walk", () => {
    expect(ancestry("999", tree)).toEqual([]);
  });

  it("cannot be hung by a cycle", () => {
    const loop = new Map([
      ["10", { ppid: "11", comm: "a" }],
      ["11", { ppid: "10", comm: "b" }],
    ]);
    expect(ancestry("10", loop)).toEqual(["a", "b"]);
  });
});

describe("launchedBy", () => {
  it("names the app at the top of the line", () => {
    expect(launchedBy(["node", "npm run dev", "disclaimer", "Claude"])).toBe("Claude");
  });

  it("has nothing to say without a lineage", () => {
    expect(launchedBy([])).toBeUndefined();
    expect(launchedBy(undefined)).toBeUndefined();
  });
});

/* ─── The mark we leave on our own children ─── */

// Measured: the process tree tops out at "Raycast Beta" — one backend for every
// extension, its whole command line being those four words. So the tree cannot
// say which extension launched a server, and this mark is how we answer without
// assuming we are the only one that ever would.
describe("parseLaunchMarks", () => {
  it("reads the profile id back out of a process environment", () => {
    const raw = "71153 /usr/bin/python3 -m http.server PATH=/usr/bin PORT_WATCHER_PROFILE=abc-123 SHELL=/bin/zsh\n";
    expect(parseLaunchMarks(raw)).toEqual(new Map([["71153", "abc-123"]]));
  });

  it("says nothing about a process that never carried the mark", () => {
    expect(parseLaunchMarks("633 /System/…/ControlCenter PATH=/usr/bin HOME=/Users/me\n")).toEqual(new Map());
  });

  it("picks out only the marked processes in a batch", () => {
    const raw = [
      "633 ControlCenter PATH=/usr/bin",
      "71153 python3 PORT_WATCHER_PROFILE=abc-123 PATH=/usr/bin",
      "71160 node PORT_WATCHER_PROFILE=def-456 HOME=/Users/me",
      "",
    ].join("\n");
    expect(parseLaunchMarks(raw)).toEqual(
      new Map([
        ["71153", "abc-123"],
        ["71160", "def-456"],
      ]),
    );
  });

  // The value stops at the first space, like any env var ps prints.
  it("takes the id and not the variable that follows it", () => {
    expect(parseLaunchMarks("1 node PORT_WATCHER_PROFILE=abc-123 NEXT=1\n").get("1")).toBe("abc-123");
  });

  it("is not fooled by a variable that merely ends the same way", () => {
    expect(parseLaunchMarks("1 node NOT_PORT_WATCHER_PROFILE=abc\n")).toEqual(new Map());
  });

  it("returns an empty map on empty input", () => {
    expect(parseLaunchMarks("")).toEqual(new Map());
  });
});

/* ─── fetchStartTimes: ps answers about the living, and exits 1 anyway ─── */

// The distinction the kill gate rests on: ps exits 1 both when nothing matched
// (an answer — they are gone) and when it could not look at all (a failure).
// Only stderr tells them apart, and reading "gone" out of an outage would excuse
// a signal on nothing observed.
describe("fetchStartTimes", () => {
  // A pid that is well-formed and certainly not in use. 999999 would NOT do: it
  // is past macOS's pid ceiling, so ps rejects the argument instead — a failure,
  // not an absence, which is the very thing this describe exists to separate.
  async function deadPid(): Promise<string> {
    const child = spawn("sleep", ["30"], { stdio: "ignore" });
    const pid = String(child.pid);
    await new Promise((r) => setTimeout(r, 200));
    child.kill("SIGKILL");
    for (let i = 0; i < 20 && (await fetchStartTimes([pid])).has(pid); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return pid;
  }

  it("reads the start time of a living process", async () => {
    const pid = String(process.pid);
    const started = (await fetchStartTimes([pid])).get(pid);

    expect(started).toBeDefined();
    // Opaque by design — never parsed, only compared. Five words from ps.
    expect(started).toMatch(/\w{3}\s+\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4}/);
  });

  it("answers about the living and stays silent about the dead in one batch", async () => {
    const mine = String(process.pid);
    const dead = await deadPid();

    const map = await fetchStartTimes([mine, dead]);

    expect(map.get(mine)).toBeDefined();
    expect(map.has(dead)).toBe(false); // absent is how "gone" is spelled here
  });

  it("reads no match as an empty map, not as a failure — that is how gone is said", async () => {
    await expect(fetchStartTimes([await deadPid()])).resolves.toEqual(new Map());
  });

  // The other half, and the one that matters: ps failing must NOT read as "all
  // gone", or killListener would report an outage as "already exited".
  it("throws when ps could not look, rather than reporting everything gone", async () => {
    await expect(fetchStartTimes(["999999"])).rejects.toThrow();
  });

  it("returns an empty map for an empty batch without calling ps", async () => {
    expect(await fetchStartTimes([])).toEqual(new Map());
  });
});

/* ─── readListeningPorts: the one entry point the UI reads ─── */

describe("readListeningPorts", () => {
  // Three enrichments land on each row through one Promise.all. Swap two of them
  // and command lines end up in the cwd field: every row then misclassifies and
  // matching silently stops working. This pins that they land where they belong.
  it("lands each enrichment on the right field of the right row", async () => {
    const dir = await canonicalCwd(mkdtempSync(join("/private/tmp", "pw-read-")));
    const child = spawn(process.env.SHELL || "/bin/zsh", ["-l", "-c", "python3 -m http.server 0 --bind 127.0.0.1"], {
      cwd: dir,
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    try {
      let mine: ListeningPort | undefined;
      for (let i = 0; i < 40 && !mine; i++) {
        mine = (await readListeningPorts()).find((p) => p.cwd === dir);
        if (!mine) await new Promise((r) => setTimeout(r, 100));
      }

      expect(mine).toBeDefined();
      expect(mine!.cwd).toBe(dir); // from lsof -d cwd
      expect(mine!.fullCommand).toContain("http.server"); // from ps -o command
      expect(mine!.started).toBeDefined(); // from ps -o lstart
      expect(mine!.kind).toBe("project"); // classify, off the cwd
      expect(mine!.address).toBe("127.0.0.1");
      expect(Number(mine!.port)).toBeGreaterThan(0);
    } finally {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        /* already gone */
      }
    }
  });
});

/* ─── killListener: the one path that sends a signal ─── */

// Against real processes, no mocks: the whole point of the gate is what the OS
// reports back, so faking ps or process.kill would test the fake.
describe("killListener", () => {
  const alive: ChildProcess[] = [];

  // A real process, and a target built around its real pid and start time —
  // which is exactly what the UI holds when you press Kill.
  async function victim(): Promise<ListeningPort> {
    const child = spawn("sleep", ["30"], { stdio: "ignore" });
    alive.push(child);
    const pid = String(child.pid);
    // ps needs the process to exist; spawn resolves the pid before exec lands.
    for (let i = 0; i < 20 && !(await fetchStartTimes([pid])).get(pid); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const started = (await fetchStartTimes([pid])).get(pid);
    expect(started).toBeDefined(); // the fixture itself must be sound
    return { command: "sleep", pid, port: "9999", address: "127.0.0.1", kind: "project", cwd: "/proj", started };
  }

  const isAlive = (pid: string) => {
    try {
      process.kill(Number(pid), 0);
      return true;
    } catch {
      return false;
    }
  };

  afterEach(() => {
    for (const c of alive.splice(0)) {
      try {
        c.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }
  });

  it("signals a process whose start time still matches", async () => {
    const target = await victim();
    expect(await killListener(target)).toBe("signaled");
    expect(await waitForExit(target.pid)).toBe(true);
  });

  it("force-kills through the same gate", async () => {
    const target = await victim();
    expect(await killListener(target, { force: true })).toBe("signaled");
    expect(await waitForExit(target.pid)).toBe(true);
  });

  // The reason this gate exists: the pid is right, the process is not.
  it("refuses a recycled pid, and sends nothing", async () => {
    const target = await victim();
    const recycled = { ...target, started: "Thu Jan  1 00:00:00 2020" };

    expect(await killListener(recycled)).toBe("replaced");
    expect(isAlive(target.pid)).toBe(true); // the invariant that matters
  });

  it("refuses an identity it never observed, and sends nothing", async () => {
    const target = await victim();

    expect(await killListener({ ...target, started: undefined })).toBe("unverified");
    expect(isAlive(target.pid)).toBe(true);
  });

  it("refuses SIGKILL on a recycled pid too — the worst outcome it can prevent", async () => {
    const target = await victim();
    const recycled = { ...target, started: "Thu Jan  1 00:00:00 2020" };

    expect(await killListener(recycled, { force: true })).toBe("replaced");
    expect(isAlive(target.pid)).toBe(true);
  });

  it("reports a process that already exited as gone", async () => {
    const target = await victim();
    await killListener(target);
    await waitForExit(target.pid);

    expect(await killListener(target)).toBe("gone");
  });

  // This used to assert "gone" for pid 999999 and pass — but for the wrong
  // reason: that pid is past the OS ceiling, so ps rejects the argument, and the
  // old salvage read the resulting silence as "everything is gone". The honest
  // answer when ps could not look is that we could not verify, and no signal.
  it("says unverified when ps could not look, rather than claiming the process is gone", async () => {
    const nobody: ListeningPort = {
      command: "ghost",
      pid: "999999",
      port: "1",
      address: "127.0.0.1",
      kind: "project",
      started: "Thu Jul 17 11:14:27 2026",
    };
    expect(await killListener(nobody)).toBe("unverified");
  });
});

describe("parsePidRest", () => {
  it("maps each pid to the rest of its line", () => {
    const raw = "  620 /usr/libexec/rapportd\n41235 node /Users/me/node_modules/.bin/vite\n";
    expect(parsePidRest(raw)).toEqual(
      new Map([
        ["620", "/usr/libexec/rapportd"],
        ["41235", "node /Users/me/node_modules/.bin/vite"],
      ]),
    );
  });

  it("keeps the spaces inside the rest — a start time is five words", () => {
    expect(parsePidRest("  620 Thu Jul 17 11:14:27 2026    \n").get("620")).toBe("Thu Jul 17 11:14:27 2026");
  });

  it("skips blanks and lines that do not start with a pid", () => {
    expect(parsePidRest("\nnot a pid line\n")).toEqual(new Map());
  });

  it("returns an empty map on empty input", () => {
    expect(parsePidRest("")).toEqual(new Map());
  });
});

describe("killVerdict", () => {
  const born = "Thu Jul 17 11:14:27 2026";

  it("proceeds only when the observed start time matches the one the user saw", () => {
    expect(killVerdict(born, born)).toBe("proceed");
  });

  it("reports gone when the pid is not in use at all", () => {
    expect(killVerdict(born, undefined)).toBe("gone");
  });

  it("refuses a recycled pid — same number, different birth", () => {
    expect(killVerdict(born, "Thu Jul 17 11:20:00 2026")).toBe("replaced");
  });

  it("refuses to claim an identity it never observed", () => {
    expect(killVerdict(undefined, born)).toBe("unverified");
  });

  it("gone outranks an expectation we never had", () => {
    expect(killVerdict(undefined, undefined)).toBe("gone");
  });
});

describe("parseLsofOutput", () => {
  it("reads one entry per process/port from -Fpcn blocks", () => {
    const raw = ["p620", "crapportd", "f14", "n*:64278", "p859", "cfigma_agent", "f9", "n127.0.0.1:44960", ""].join(
      "\n",
    );
    expect(parseLsofOutput(raw)).toEqual([
      { command: "rapportd", pid: "620", address: "*", port: "64278" },
      { command: "figma_agent", pid: "859", address: "127.0.0.1", port: "44960" },
    ]);
  });

  it("keeps command names containing spaces whole — the bug the column parser had", () => {
    const raw = "p123\ncClaude Helper (Renderer)\nf20\nn127.0.0.1:9222\n";
    expect(parseLsofOutput(raw)).toEqual([
      { command: "Claude Helper (Renderer)", pid: "123", address: "127.0.0.1", port: "9222" },
    ]);
  });

  it("dedupes the IPv4/IPv6 twin of one process on one port", () => {
    const raw = "p620\ncrapportd\nf14\nn*:64278\nf15\nn*:64278\n";
    expect(parseLsofOutput(raw)).toHaveLength(1);
  });

  it("keeps distinct ports of one process, and one port held by two processes", () => {
    const raw = ["p620", "crapportd", "n*:5000", "n*:7000", "p999", "cnode", "n127.0.0.1:5000", ""].join("\n");
    expect(parseLsofOutput(raw)).toEqual([
      { command: "rapportd", pid: "620", address: "*", port: "5000" },
      { command: "rapportd", pid: "620", address: "*", port: "7000" },
      { command: "node", pid: "999", address: "127.0.0.1", port: "5000" },
    ]);
  });

  it("splits an IPv6 name on its last colon", () => {
    expect(parseLsofOutput("p1\ncnode\nn[::1]:5173\n")).toEqual([
      { command: "node", pid: "1", address: "[::1]", port: "5173" },
    ]);
  });

  it("skips a name with no port rather than inventing one", () => {
    expect(parseLsofOutput("p1\ncnode\nn*:*\n")).toEqual([]);
  });

  it("skips a name arriving before its block has a pid and command", () => {
    expect(parseLsofOutput("n127.0.0.1:3000\np1\nn127.0.0.1:4000\n")).toEqual([]);
  });

  it("returns an empty list on empty input", () => {
    expect(parseLsofOutput("")).toEqual([]);
  });

  // A pid must be digits. A degenerate value (Number("0") and Number("") are 0,
  // and process.kill(0) signals the caller's whole group) must never reach a row.
  it("drops a block whose pid is not a plain number", () => {
    expect(parseLsofOutput("p-1\ncnode\nn127.0.0.1:3000\n")).toEqual([]);
    expect(parseLsofOutput("p0abc\ncnode\nn127.0.0.1:3000\n")).toEqual([]);
  });

  it("still reads a well-formed block right after a rejected one", () => {
    const raw = "p-1\ncbad\nn127.0.0.1:1\np42\ncnode\nn127.0.0.1:3000\n";
    expect(parseLsofOutput(raw)).toEqual([{ command: "node", pid: "42", address: "127.0.0.1", port: "3000" }]);
  });
});

describe("isExposed", () => {
  it("flags every-interface bindings", () => {
    expect(isExposed("*")).toBe(true);
    expect(isExposed("0.0.0.0")).toBe(true);
    expect(isExposed("::")).toBe(true);
  });

  it("leaves loopback bindings alone", () => {
    expect(isExposed("127.0.0.1")).toBe(false);
    expect(isExposed("[::1]")).toBe(false);
  });
});

describe("classify", () => {
  it("files a process with a project cwd as project", () => {
    expect(classify("node", "/Users/me/Projects/site")).toBe("project");
  });

  it("files a launchd daemon (cwd /) as system", () => {
    expect(classify("rapportd", "/")).toBe("system");
  });

  it("files a process with no readable cwd as system", () => {
    expect(classify("rapportd", undefined)).toBe("system");
  });

  it("recognises container runtimes by name, whatever their cwd", () => {
    expect(classify("com.docker.backend", "/")).toBe("container");
    expect(classify("OrbStack Helper", "/Users/me")).toBe("container");
    expect(classify("gvproxy", undefined)).toBe("container");
  });

  it("never files a container as system: the hint list can only un-hide", () => {
    expect(classify("docker-proxy", undefined)).not.toBe("system");
  });
});

describe("parseCwdOutput", () => {
  it("maps each pid to its cwd path", () => {
    const raw = ["p620", "fcwd", "n/", "p123", "fcwd", "n/Users/me/Projects/site", ""].join("\n");
    expect(parseCwdOutput(raw)).toEqual(
      new Map([
        ["620", "/"],
        ["123", "/Users/me/Projects/site"],
      ]),
    );
  });

  it("keeps paths containing spaces intact", () => {
    const raw = "p123\nfcwd\nn/Users/me/My Projects/site\n";
    expect(parseCwdOutput(raw).get("123")).toBe("/Users/me/My Projects/site");
  });

  it("returns an empty map on empty input", () => {
    expect(parseCwdOutput("")).toEqual(new Map());
  });
});

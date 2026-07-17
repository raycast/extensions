import { describe, it, expect } from "vitest";
import { classify, isExposed, killVerdict, parseCwdOutput, parseLsofOutput, parsePidRest } from "../src/system";

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

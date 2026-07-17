import { describe, it, expect } from "vitest";
import { classify, isExposed, parseCwdOutput, parseLsofOutput, sameListener } from "../src/system";
import type { ListeningPort } from "../src/system";

describe("sameListener", () => {
  const seen: ListeningPort = {
    command: "node",
    pid: "500",
    port: "5173",
    address: "127.0.0.1",
    kind: "project",
    cwd: "/proj",
  };

  it("recognizes the same listener", () => {
    expect(sameListener({ ...seen }, seen)).toBe(true);
  });

  it("ignores the address: the family can differ between two readings", () => {
    expect(sameListener({ ...seen, address: "*" }, seen)).toBe(true);
  });

  it("rejects a recycled pid now held by another command — the reason this exists", () => {
    expect(sameListener({ ...seen, command: "Mail" }, seen)).toBe(false);
  });

  it("rejects the same pid on another port", () => {
    expect(sameListener({ ...seen, port: "3000" }, seen)).toBe(false);
  });

  it("rejects the same pid running from another folder", () => {
    expect(sameListener({ ...seen, cwd: "/elsewhere" }, seen)).toBe(false);
  });

  it("rejects a different pid", () => {
    expect(sameListener({ ...seen, pid: "999" }, seen)).toBe(false);
  });

  it("matches two listeners whose cwd is equally unknown", () => {
    const noCwd = { ...seen, cwd: undefined };
    expect(sameListener({ ...noCwd }, noCwd)).toBe(true);
  });

  it("refuses to match when only one side has a known cwd", () => {
    expect(sameListener({ ...seen, cwd: undefined }, seen)).toBe(false);
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

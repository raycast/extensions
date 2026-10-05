import { describe, expect, it } from "vitest";
import codeBlock from "../src/utilities/codeBlock";
import { classifyExposure, exposureColor, exposureDescription } from "../src/utilities/exposure";
import { getProcessMarkdown } from "../src/utilities/getProcessMarkdown";
import { getProcessAccessories } from "../src/utilities/getProcessAccessories";
import removeDuplicates from "../src/utilities/removeDuplicates";
import { isNumeric } from "../src/utilities/guards/is-numeric";
import isStringBlank from "../src/utilities/guards/is-string-blank";
import type Process from "../src/models/Process";

describe("exposure", () => {
  it.each(["*", "0.0.0.0", "::", "[::]", ""])("classifies wildcard %s", (host) => {
    expect(classifyExposure(host)).toBe("all-interfaces");
  });
  it.each(["localhost", "127.0.0.1", "127.10.20.30", "::1", "[::1]"])("classifies loopback %s", (host) => {
    expect(classifyExposure(host)).toBe("loopback");
  });
  it.each(["192.168.1.2", "[fe80::1]"])("classifies specific interface %s", (host) => {
    expect(classifyExposure(host)).toBe("specific");
  });
  it("gives each exposure a color and description", () => {
    expect(exposureColor("loopback")).toBe("green");
    expect(exposureColor("all-interfaces")).toBe("orange");
    expect(exposureColor("specific")).toBe("blue");
    expect(exposureDescription("loopback")).toBe("Reachable only from this machine");
    expect(exposureDescription("all-interfaces")).toBe("Reachable from the network");
    expect(exposureDescription("specific")).toBe("Bound to one specific interface");
  });
});

describe("process display", () => {
  it("uses a fence longer than untrusted backticks", () => {
    expect(codeBlock("node server.js")).toBe("```\nnode server.js\n```");
    expect(codeBlock("```\n# injected\n````")).toBe("`````\n```\n# injected\n````\n`````");
    expect(codeBlock("")).toBe("```\n\n```");
  });
  it("deduplicates the heading ports while retaining bind addresses", () => {
    const markdown = getProcessMarkdown({
      pid: 42,
      name: "node",
      commandLine: "node server.js",
      portInfo: [
        { host: "127.0.0.1", port: 3000 },
        { host: "[::1]", port: 3000 },
        { host: "*", port: 3001 },
      ],
    } as Process);
    expect(markdown).toBe(
      "## Ports 3000, 3001\n\n**node** (PID 42) is listening on `127.0.0.1:3000`, `[::1]:3000`, `*:3001`\n\n**Command Line**\n\n```\nnode server.js\n```",
    );
  });
  it("escapes process names and removes inline backticks from addresses", () => {
    expect(getProcessMarkdown({ pid: 42, name: "[bad]*", portInfo: [{ host: "`host`", port: 80 }] } as Process)).toBe(
      "## Port 80\n\n**\\[bad\\]\\*** (PID 42) is listening on `host:80`",
    );
    expect(getProcessMarkdown({ pid: 42 } as Process)).toBe("## Untitled Process");
  });
  it("labels named ports and shows their exposure", () => {
    expect(
      getProcessAccessories({
        pid: 42,
        portInfo: [
          { host: "127.0.0.1", port: 3000, name: "Dev" },
          { host: "*", port: 80 },
        ],
      } as Process),
    ).toEqual([
      { tooltip: "127.0.0.1:3000 — Reachable only from this machine", tag: { value: "3000 (Dev)", color: "green" } },
      { tooltip: "*:80 — Reachable from the network", tag: { value: "80", color: "orange" } },
    ]);
    expect(getProcessAccessories({ pid: 42 } as Process)).toEqual([]);
  });
});

describe("input helpers", () => {
  it.each([0, -1, 1.5, "1", "1e5", "0x10"])("accepts numeric value %s", (value) => {
    expect(isNumeric(value)).toBe(true);
  });
  it.each(["", " \t", "1foo", NaN, Infinity, null, undefined, {}, true])("rejects nonnumeric value %s", (value) => {
    expect(isNumeric(value)).toBe(false);
  });
  it("recognizes Unicode whitespace and rejects visible characters", () => {
    expect(isStringBlank("\t\n\r \u0085\u00a0\u1680\u180e\u2000\u200d\u2028\u2029\u202f\u205f\u2060\u3000\ufeff")).toBe(
      true,
    );
    expect(isStringBlank("")).toBe(true);
    expect(isStringBlank("  a  ")).toBe(false);
  });
  it("keeps the first item for each key without changing the input", () => {
    const items = [
      { pid: 1, name: "first" },
      { pid: 1, name: "second" },
      { pid: 2, name: "third" },
    ];
    expect(removeDuplicates(items, "pid")).toEqual([items[0], items[2]]);
    expect(items).toHaveLength(3);
    expect(removeDuplicates([], "pid")).toEqual([]);
  });
});

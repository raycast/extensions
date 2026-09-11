import { execFileSync } from "node:child_process";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { getPreferenceValuesMock } = vi.hoisted(() => {
  return { getPreferenceValuesMock: vi.fn() };
});

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => getPreferenceValuesMock(),
}));

import {
  backupLabel,
  basenameFromPath,
  cleanOutput,
  extractIpv4,
  fetchIp,
  getPaths,
  mdCode,
  nowStamp,
  parseErrorMessage,
  parseKeyValueLines,
  parseSshJson,
  shortDate,
  shQuote,
  stripAnsi,
} from "../utils";

beforeEach(() => {
  getPreferenceValuesMock.mockReset();
});

describe("shQuote", () => {
  test("produces a shell-safe token for a value with a single quote", () => {
    const value = "it's tricky";
    expect(shQuote(value)).toBe("'it'\\''s tricky'");
  });

  test("round-trips a value containing a single quote through sh", () => {
    const value = 'it\'s $HOME `tricky` "value"';
    const quoted = shQuote(value);
    const out = execFileSync("sh", ["-c", `printf '%s' ${quoted}`]).toString();
    expect(out).toBe(value);
  });

  test("round-trips a value with spaces and a dollar sign through sh", () => {
    const value = "hello $USER world";
    const quoted = shQuote(value);
    const out = execFileSync("sh", ["-c", `printf '%s' ${quoted}`]).toString();
    expect(out).toBe(value);
  });
});

describe("stripAnsi", () => {
  test("removes ANSI color codes", () => {
    const input = "[31mred text[0m plain";
    expect(stripAnsi(input)).toBe("red text plain");
  });
});

describe("cleanOutput", () => {
  test("merges stdout and stderr, trimming and dropping empty lines", () => {
    const stdout = "  real output line  \n\nsecond line";
    const stderr = "error line\n";
    const result = cleanOutput(stdout, stderr);
    expect(result.text).toBe("real output line\nsecond line\nerror line");
    expect(result.firstLine).toBe("real output line");
  });

  test("returns placeholder text for empty input", () => {
    const result = cleanOutput("", "");
    expect(result.text).toBe("(empty)");
    expect(result.firstLine).toBe("—");
  });
});

describe("parseKeyValueLines", () => {
  test("parses basic key=value lines", () => {
    expect(parseKeyValueLines("a=1\nb=2")).toEqual({ a: "1", b: "2" });
  });

  test("keeps '=' characters that are part of the value", () => {
    expect(parseKeyValueLines("query=a=b=c")).toEqual({ query: "a=b=c" });
  });

  test("ignores lines without '='", () => {
    expect(parseKeyValueLines("a=1\nnoequalsign\nb=2")).toEqual({ a: "1", b: "2" });
  });
});

describe("extractIpv4", () => {
  test("extracts the first IPv4 address found", () => {
    expect(extractIpv4("connected from 192.168.1.10 on port 22")).toBe("192.168.1.10");
  });

  test("returns null when no IPv4 address is present", () => {
    expect(extractIpv4("no address here")).toBeNull();
  });
});

describe("basenameFromPath", () => {
  test("returns the last path segment", () => {
    expect(basenameFromPath("/a/b/c.json")).toBe("c.json");
  });

  test("ignores a trailing slash", () => {
    expect(basenameFromPath("/a/b/")).toBe("b");
  });

  test("falls back to config.json for an empty path", () => {
    expect(basenameFromPath("")).toBe("config.json");
  });
});

describe("backupLabel", () => {
  test("replaces special characters with dashes and lower-cases the label", () => {
    expect(backupLabel("Hello, World!")).toBe("hello-world");
  });

  test("falls back to 'manual' for an empty label", () => {
    expect(backupLabel("")).toBe("manual");
  });
});

describe("nowStamp", () => {
  test("formats as YYYYMMDD-HHMMSS", () => {
    expect(nowStamp()).toMatch(/^\d{8}-\d{6}$/);
  });
});

describe("parseErrorMessage", () => {
  test("extracts the message from an Error instance", () => {
    expect(parseErrorMessage(new Error("boom"))).toBe("boom");
  });

  test("stringifies non-Error values", () => {
    expect(parseErrorMessage("plain string")).toBe("plain string");
  });

  test("falls back to 'Unknown error' for nullish values", () => {
    expect(parseErrorMessage(undefined)).toBe("Unknown error");
  });
});

describe("mdCode", () => {
  test("wraps text in a markdown code block with a heading", () => {
    expect(mdCode("Title", "hello")).toBe("# Title\n\n```\nhello\n```");
  });

  test("shows a placeholder for empty text", () => {
    expect(mdCode("Title", "")).toBe("# Title\n\n```\n(empty)\n```");
  });
});

describe("parseSshJson", () => {
  test("parses JSON found between markers", () => {
    const stdout = 'noise\n___JSON_START___{"a":1}___JSON_END___\nmore noise';
    expect(parseSshJson(stdout)).toEqual({ a: 1 });
  });

  test("returns null when markers are missing", () => {
    expect(parseSshJson("no markers here")).toBeNull();
  });

  test("returns null when the JSON between markers is invalid", () => {
    const stdout = "___JSON_START___{not valid json}___JSON_END___";
    expect(parseSshJson(stdout)).toBeNull();
  });
});

describe("fetchIp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns the first IPv4 address from a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("your ip is 203.0.113.5") }),
    );
    await expect(fetchIp("https://example.com")).resolves.toBe("203.0.113.5");
  });

  test("returns null when the response body has no IPv4 address", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("no address here") }));
    await expect(fetchIp("https://example.com")).resolves.toBeNull();
  });

  test("returns null when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve("") }));
    await expect(fetchIp("https://example.com")).resolves.toBeNull();
  });

  test("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(fetchIp("https://example.com")).resolves.toBeNull();
  });
});

describe("shortDate", () => {
  test("returns an empty string for a falsy value", () => {
    expect(shortDate(undefined)).toBe("");
    expect(shortDate("")).toBe("");
  });

  test("returns the original string for an invalid date", () => {
    expect(shortDate("not-a-date")).toBe("not-a-date");
  });

  test("formats a valid ISO date using the ru-RU locale", () => {
    const iso = "2026-01-15T10:30:00.000Z";
    expect(shortDate(iso)).toBe(new Date(iso).toLocaleString("ru-RU"));
  });
});

describe("getPaths", () => {
  test("falls back to default directories when preferences are empty", () => {
    getPreferenceValuesMock.mockReturnValue({ sshHost: "xkeen" });
    expect(getPaths()).toEqual({
      configDir: "/opt/etc/xray/configs",
      profilesDir: "/opt/etc/xray/configs-profiles",
    });
  });

  test("uses configured directories when present", () => {
    getPreferenceValuesMock.mockReturnValue({
      sshHost: "xkeen",
      configDir: "/custom/configs",
      profilesDir: "/custom/profiles",
    });
    expect(getPaths()).toEqual({
      configDir: "/custom/configs",
      profilesDir: "/custom/profiles",
    });
  });
});

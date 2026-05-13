import { describe, test, expect } from "bun:test";
import { Cache } from "../src/cache";
import { BuildContext } from "../src/context";
import {
  parseHistoryLine,
  isMetaCommand,
  getHistoryFile,
} from "../src/history";

describe("Cache", () => {
  test("put then get returns stored value", () => {
    const cache = new Cache(60, 128);
    cache.put("k", "v");
    expect(cache.get("k")).toBe("v");
    expect(cache.size()).toBe(1);
  });

  test("get on missing key returns undefined", () => {
    expect(new Cache(60, 128).get("missing")).toBeUndefined();
  });

  test("expired entries return undefined and are evicted", async () => {
    const cache = new Cache(1, 128);
    cache.put("k", "v");
    expect(cache.get("k")).toBe("v");
    await Bun.sleep(1100);
    expect(cache.get("k")).toBeUndefined();
    expect(cache.size()).toBe(0);
  }, 5000);

  test("LRU evicts least recently used when full", () => {
    const cache = new Cache(60, 3);
    cache.put("a", "1");
    cache.put("b", "2");
    cache.put("c", "3");
    cache.get("a");
    cache.put("d", "4");

    expect(cache.size()).toBe(3);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
    expect(cache.has("d")).toBe(true);
  });

  test("put on existing key updates value without growing size", () => {
    const cache = new Cache(60, 128);
    cache.put("k", "v1");
    cache.put("k", "v2");
    expect(cache.size()).toBe(1);
    expect(cache.get("k")).toBe("v2");
  });

  test("clear empties the cache", () => {
    const cache = new Cache(60, 128);
    cache.put("a", "1");
    cache.put("b", "2");
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });
});

describe("BuildContext", () => {
  test("returns the current OS, shell and cwd", () => {
    const ctx = BuildContext();
    expect(["macOS", "Linux", "Windows"]).toContain(ctx.os);
    expect(ctx.cwd.length).toBeGreaterThan(0);
    expect(ctx.shell.length).toBeGreaterThan(0);
  });
});

describe("history.parseHistoryLine", () => {
  test("zsh format strips timestamp prefix", () => {
    expect(parseHistoryLine(": 1700000000:0;ls -la", "zsh")).toBe("ls -la");
  });

  test("zsh format preserves semicolons inside commands", () => {
    expect(parseHistoryLine(": 1700000000:0;echo a; echo b", "zsh")).toBe(
      "echo a; echo b"
    );
  });

  test("zsh line without timestamp returns trimmed input", () => {
    expect(parseHistoryLine("ls -la", "zsh")).toBe("ls -la");
  });

  test("bash returns trimmed line as-is", () => {
    expect(parseHistoryLine("  echo hi  ", "bash")).toBe("echo hi");
  });

  test("fish parses YAML cmd entries only", () => {
    expect(parseHistoryLine("- cmd: ls", "fish")).toBe("ls");
    expect(parseHistoryLine("  when: 1700000000", "fish")).toBe("");
  });

  test("empty line returns empty string", () => {
    expect(parseHistoryLine("   ", "bash")).toBe("");
  });
});

describe("history.isMetaCommand", () => {
  test.each([["k"], ["./k"], ["raycast"], ["komplete --help"], ["./komplete"]])(
    "filters %p",
    (cmd) => {
      expect(isMetaCommand(cmd)).toBe(true);
    }
  );

  test.each([["ls"], ["git status"], ["npm install"]])("keeps %p", (cmd) => {
    expect(isMetaCommand(cmd)).toBe(false);
  });
});

describe("history.getHistoryFile", () => {
  test("zsh shell maps to .zsh_history", () => {
    expect(getHistoryFile("/bin/zsh")).toMatch(/\.zsh_history$/);
  });

  test("bash shell maps to .bash_history", () => {
    expect(getHistoryFile("/bin/bash")).toMatch(/\.bash_history$/);
  });

  test("fish shell maps to fish_history under .local/share", () => {
    expect(getHistoryFile("fish")).toMatch(/fish_history$/);
  });

  test("unknown shell falls back to .bash_history", () => {
    expect(getHistoryFile("tcsh")).toMatch(/\.bash_history$/);
  });
});

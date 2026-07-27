import { describe, expect, it, vi } from "vitest";
import {
  notFoundMessage,
  parseShebang,
  probeEngineAvailability,
  probeKeshaVersion,
  resolveKeshaBin,
} from "../src/lib/kesha-bin";
import type { KeshaBinDeps, ProbeDeps } from "../src/lib/kesha-bin";

describe("parseShebang", () => {
  it("extracts the interpreter line from a shebang header", () => {
    expect(parseShebang(Buffer.from("#!/usr/bin/env bun\nconsole.log()"))).toBe(
      "/usr/bin/env bun",
    );
    expect(parseShebang(Buffer.from("#!/bin/sh -e\n"))).toBe("/bin/sh -e");
    expect(parseShebang(Buffer.from("#!/bin/sh"))).toBe("/bin/sh");
    expect(parseShebang(Buffer.from("#!/usr/bin/env bun\r\nrest"))).toBe(
      "/usr/bin/env bun",
    );
    expect(parseShebang(Buffer.from("#! /bin/sh \n"))).toBe("/bin/sh");
  });

  it("returns null for binaries and empty files", () => {
    expect(parseShebang(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))).toBeNull();
    expect(parseShebang(Buffer.alloc(0))).toBeNull();
    expect(parseShebang(Buffer.from("#"))).toBeNull();
  });
});

interface FakeFile {
  shebang?: string;
  realpath?: string;
}

function fakeDeps(
  files: Record<string, FakeFile>,
  overrides: KeshaBinDeps = {},
): KeshaBinDeps {
  return {
    interpreterCandidates: [],
    isExecutable: async (path) => path in files,
    readShebang: async (path) => files[path]?.shebang ?? null,
    realpath: async (path) => files[path]?.realpath ?? path,
    ...overrides,
  };
}

describe("resolveKeshaBin", () => {
  it("prefers the explicit preference and trims it", async () => {
    const deps = fakeDeps(
      { "/custom/kesha": {} },
      { candidates: ["/fallback/kesha"] },
    );
    expect(await resolveKeshaBin(" /custom/kesha ", deps)).toEqual({
      command: "/custom/kesha",
      prefixArgs: [],
    });
  });

  it("does not fall back to candidates when the preference is unusable", async () => {
    const deps = fakeDeps(
      { "/fallback/kesha": {} },
      { candidates: ["/fallback/kesha"] },
    );
    expect(await resolveKeshaBin("/missing/kesha", deps)).toBeNull();
  });

  it("returns null when every fallback candidate is non-executable", async () => {
    const deps = fakeDeps({}, { candidates: ["/a/kesha", "/b/kesha"] });
    expect(await resolveKeshaBin(undefined, deps)).toBeNull();
  });

  it("picks the first executable fallback candidate", async () => {
    const deps = fakeDeps(
      { "/second/kesha": {}, "/third/kesha": {} },
      { candidates: ["/first/kesha", "/second/kesha", "/third/kesha"] },
    );
    expect(await resolveKeshaBin(undefined, deps)).toEqual({
      command: "/second/kesha",
      prefixArgs: [],
    });
  });

  it("runs an env-shebang script through a matching interpreter", async () => {
    const deps = fakeDeps(
      {
        "/global/kesha": { realpath: "/pkg/cli.ts" },
        "/pkg/cli.ts": { shebang: "/usr/bin/env bun" },
        "/opt/bin/node": {},
        "/opt/bin/bun": {},
      },
      {
        candidates: ["/global/kesha"],
        interpreterCandidates: ["/opt/bin/node", "/opt/bin/bun"],
      },
    );
    expect(await resolveKeshaBin(undefined, deps)).toEqual({
      command: "/opt/bin/bun",
      prefixArgs: ["/pkg/cli.ts"],
    });
  });

  it("falls back to direct execution when no interpreter matches", async () => {
    const deps = fakeDeps(
      {
        "/global/kesha": { realpath: "/pkg/cli.ts" },
        "/pkg/cli.ts": { shebang: "/usr/bin/env bun" },
        "/opt/bin/node": {},
      },
      {
        candidates: ["/global/kesha"],
        interpreterCandidates: ["/opt/bin/node"],
      },
    );
    expect(await resolveKeshaBin(undefined, deps)).toEqual({
      command: "/global/kesha",
      prefixArgs: [],
    });
  });

  it("reads the shebang from the original path when realpath fails", async () => {
    const deps = fakeDeps(
      {
        "/global/kesha": { shebang: "/usr/bin/env bun" },
        "/opt/bin/bun": {},
      },
      {
        candidates: ["/global/kesha"],
        interpreterCandidates: ["/opt/bin/bun"],
        realpath: async (path) => {
          throw new Error(`ENOENT: ${path}`);
        },
      },
    );
    expect(await resolveKeshaBin(undefined, deps)).toEqual({
      command: "/opt/bin/bun",
      prefixArgs: ["/global/kesha"],
    });
  });

  it("executes non-env shebangs directly", async () => {
    const deps = fakeDeps(
      {
        "/global/kesha": { realpath: "/pkg/kesha.sh" },
        "/pkg/kesha.sh": { shebang: "/bin/sh" },
      },
      { candidates: ["/global/kesha"] },
    );
    expect(await resolveKeshaBin(undefined, deps)).toEqual({
      command: "/global/kesha",
      prefixArgs: [],
    });
  });
});

describe("notFoundMessage", () => {
  it("leads with a brew-first numbered setup guide, not bun", () => {
    const message = notFoundMessage();
    const brewLineIndex = message.indexOf("brew install");
    const bunLineIndex = message.indexOf("bun add -g");
    expect(brewLineIndex).toBeGreaterThanOrEqual(0);
    expect(bunLineIndex).toBeGreaterThan(brewLineIndex);
    expect(message).toContain("1.");
    expect(message).toContain("2.");
    expect(message).toContain("kesha install");
  });

  it("demotes the probed-paths listing to a trailing troubleshooting line", () => {
    const message = notFoundMessage();
    const lines = message.split("\n");
    const probedIndex = lines.findIndex((line) => line.includes("Probed:"));
    expect(probedIndex).toBe(lines.length - 1);
  });
});

describe("probeKeshaVersion", () => {
  const kesha = { command: "/opt/homebrew/bin/kesha", prefixArgs: [] };

  it("returns the trimmed stdout on success", async () => {
    const execFile: ProbeDeps["execFile"] = vi.fn(async () => ({
      stdout: "kesha 1.2.3\n",
      stderr: "",
    }));
    expect(await probeKeshaVersion(kesha, { execFile })).toBe("kesha 1.2.3");
    expect(execFile).toHaveBeenCalledWith(
      kesha.command,
      [...kesha.prefixArgs, "--version"],
      { timeout: 5000 },
    );
  });

  it("returns null when the binary cannot be executed", async () => {
    const execFile: ProbeDeps["execFile"] = vi.fn(async () => {
      throw new Error("ENOENT");
    });
    expect(await probeKeshaVersion(kesha, { execFile })).toBeNull();
  });

  it("returns null when stdout is empty", async () => {
    const execFile: ProbeDeps["execFile"] = vi.fn(async () => ({
      stdout: "  ",
      stderr: "",
    }));
    expect(await probeKeshaVersion(kesha, { execFile })).toBeNull();
  });
});

describe("probeEngineAvailability", () => {
  const kesha = { command: "/opt/homebrew/bin/kesha", prefixArgs: [] };

  it("reports ok when kesha status prints no warning", async () => {
    const execFile: ProbeDeps["execFile"] = vi.fn(async () => ({
      stdout: "Engine:\n  ✓ Binary: /opt/homebrew/bin/kesha-engine\n",
      stderr: "",
    }));
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({
      ok: true,
    });
  });

  it("ignores unrelated stderr noise when stdout shows the engine installed", async () => {
    const execFile: ProbeDeps["execFile"] = vi.fn(async () => ({
      stdout: "Engine:\n  ✓ Binary: /opt/homebrew/bin/kesha-engine\n",
      stderr: "[debug +3ms] spawn kesha-engine --capabilities-json\n",
    }));
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({
      ok: true,
    });
  });

  it("surfaces the exact remaining command from kesha status's stderr warning", async () => {
    const execFile: ProbeDeps["execFile"] = vi.fn(async () => ({
      stdout: "Engine:\n  ✗ Binary: not installed\n",
      stderr: "Run `kesha install` to download the engine and models.\n",
    }));
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({
      ok: false,
      hint: "Run `kesha install` to download the engine and models.",
    });
  });

  it("fails open when the status probe cannot run at all", async () => {
    const execFile: ProbeDeps["execFile"] = vi.fn(async () => {
      throw new Error("ENOENT");
    });
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({
      ok: true,
    });
  });

  it("recovers the hint from an error carrying stderr (non-zero exit)", async () => {
    const execFile: ProbeDeps["execFile"] = vi.fn(async () => {
      const err = new Error("Command failed") as Error & { stderr?: string };
      err.stderr = "Run `kesha install` to download the engine and models.";
      throw err;
    });
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({
      ok: false,
      hint: "Run `kesha install` to download the engine and models.",
    });
  });
});

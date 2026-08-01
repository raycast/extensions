import { describe, expect, it, vi } from "vitest";
import { probeEngineAvailability } from "../src/lib/kesha-bin";
import type { ProbeDeps } from "../src/lib/kesha-bin";

// One case per row of the probe matrix in
// openspec/changes/status-json-output/design.md.
describe("probeEngineAvailability — structured status (#647)", () => {
  const kesha = { command: "/opt/homebrew/bin/kesha", prefixArgs: [] };

  function jsonStdout(payload: unknown): ProbeDeps["execFile"] {
    return vi.fn(async () => ({
      stdout: JSON.stringify(payload, null, 2),
      stderr: "",
    }));
  }

  function textStdout(stdout: string, stderr = ""): ProbeDeps["execFile"] {
    return vi.fn(async () => ({ stdout, stderr }));
  }

  it("asks the CLI for machine-readable status", async () => {
    const execFile = jsonStdout({
      engine: { installed: true, path: "/x", capabilities: { backend: "coreml" } },
    });
    await probeEngineAvailability(kesha, { execFile });
    expect(execFile).toHaveBeenCalledWith(
      "/opt/homebrew/bin/kesha",
      ["status", "--json"],
      expect.anything(),
    );
  });

  it("reports ok for an installed engine with readable capabilities", async () => {
    const execFile = jsonStdout({
      engine: {
        installed: true,
        path: "/x",
        capabilities: { protocolVersion: 3, backend: "coreml", features: ["tts"] },
      },
      hint: null,
    });
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({ ok: true });
  });

  it("takes the hint from the payload when the engine is missing", async () => {
    const execFile = jsonStdout({
      engine: { installed: false, path: "/x", capabilities: null },
      hint: "Run `kesha install` to download the engine and models.",
    });
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({
      ok: false,
      reason: "missing",
      hint: "Run `kesha install` to download the engine and models.",
    });
  });

  it("rejects an engine that is present but cannot report capabilities", async () => {
    const execFile = jsonStdout({
      engine: { installed: true, path: "/x", capabilities: null },
      hint: null,
    });
    const result = await probeEngineAvailability(kesha, { execFile });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unusable");
    expect(result.hint).toContain("--no-cache");
    // A read-only (Nix) install ignores --no-cache for the engine, so the hint
    // must not promise a fix those users cannot get.
    expect(result.hint).toContain("read-only");
  });

  it("fails closed on JSON that breaks the contract instead of matching prose", async () => {
    // Parses fine and misses the prose marker: the old rule called this healthy.
    const execFile = jsonStdout({ ok: true, engine: { path: "/x" }, hint: "setup" });
    const result = await probeEngineAvailability(kesha, { execFile });
    expect(result.ok).toBe(false);
    // Version skew is not a broken engine — re-downloading would fix nothing.
    expect(result.reason).toBe("contract");
    expect(result.hint).not.toContain("--no-cache");
  });

  it("fails closed when installed is present but not a boolean", async () => {
    const execFile = jsonStdout({ engine: { installed: "yes", capabilities: null } });
    const result = await probeEngineAvailability(kesha, { execFile });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("contract");
  });

  it("does not accept junk in place of capabilities", async () => {
    for (const capabilities of [{}, [], false, "", "coreml", 0]) {
      const execFile = jsonStdout({
        engine: { installed: true, path: "/x", capabilities },
        hint: null,
      });
      const result = await probeEngineAvailability(kesha, { execFile });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("unusable");
    }
  });

  it("falls back to prose for an older CLI reporting a missing engine", async () => {
    const execFile = textStdout(
      "Engine:\n  ✗ Binary: not installed\n\n  ✓ Runtime: Bun 1.3.13\n",
      "Run `kesha install` to download the engine and models.",
    );
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({
      ok: false,
      reason: "missing",
      hint: "Run `kesha install` to download the engine and models.",
    });
  });

  it("falls back to prose for an older CLI reporting a healthy engine", async () => {
    const execFile = textStdout(
      "Engine:\n  ✓ Binary: /opt/homebrew/bin/kesha-engine\n  ✓ Backend: coreml\n",
    );
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({ ok: true });
  });

  it("does not read the marker off a line other than Binary", async () => {
    const execFile = textStdout(
      "Engine:\n  ✓ Binary: /opt/homebrew/bin/kesha-engine\n  ✗ Diarization: not installed\n",
    );
    expect(await probeEngineAvailability(kesha, { execFile })).toEqual({ ok: true });
  });

  it("fails open on empty or garbage stdout", async () => {
    // `{not installed` is the trap: it opens like JSON, fails to parse, and
    // carries the marker — matching loose text would flip it closed.
    for (const stdout of ["", "   ", " garbage", "{not json at all", "{not installed"]) {
      expect(await probeEngineAvailability(kesha, { execFile: textStdout(stdout) })).toEqual({
        ok: true,
      });
    }
  });

  it("fails open on a JSON array", async () => {
    expect(await probeEngineAvailability(kesha, { execFile: textStdout("[1,2,3]") })).toEqual({
      ok: true,
    });
  });
});

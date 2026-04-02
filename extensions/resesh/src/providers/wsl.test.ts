import { buildWslKey, wslUncPath, parseWslFilter, WSL_PREFIX } from "./wsl";

// ---------------------------------------------------------------------------
// buildWslKey (pure)
// ---------------------------------------------------------------------------

describe("buildWslKey", () => {
  it("builds wsl:distro:dir key", () => {
    expect(buildWslKey("Ubuntu", "/home/user/project")).toBe("wsl:Ubuntu:/home/user/project");
  });

  it("WSL_PREFIX is wsl:", () => {
    expect(WSL_PREFIX).toBe("wsl:");
  });
});

// ---------------------------------------------------------------------------
// wslUncPath (pure)
// ---------------------------------------------------------------------------

describe("wslUncPath", () => {
  it("converts Linux path to UNC path", () => {
    expect(wslUncPath("Ubuntu", "/home/user/project")).toBe("\\\\wsl$\\Ubuntu\\home\\user\\project");
  });

  it("handles root path", () => {
    expect(wslUncPath("Debian", "/")).toBe("\\\\wsl$\\Debian\\");
  });
});

// ---------------------------------------------------------------------------
// parseWslFilter (pure)
// ---------------------------------------------------------------------------

describe("parseWslFilter", () => {
  it("parses valid WSL filter", () => {
    expect(parseWslFilter("wsl:Ubuntu:/home/user/project")).toEqual({
      distro: "Ubuntu",
      dir: "/home/user/project",
    });
  });

  it("returns null for null input", () => {
    expect(parseWslFilter(null)).toBeNull();
  });

  it("returns null for non-WSL string", () => {
    expect(parseWslFilter("some-project")).toBeNull();
  });

  it("returns null when no second colon after distro", () => {
    expect(parseWslFilter("wsl:Ubuntu")).toBeNull();
  });

  it("handles distro with empty dir", () => {
    expect(parseWslFilter("wsl:Ubuntu:")).toEqual({ distro: "Ubuntu", dir: "" });
  });

  it("handles colons in directory path", () => {
    expect(parseWslFilter("wsl:Ubuntu:/path:with:colons")).toEqual({
      distro: "Ubuntu",
      dir: "/path:with:colons",
    });
  });
});

// ---------------------------------------------------------------------------
// wslEnabled — platform-dependent
// ---------------------------------------------------------------------------

const isWindows = process.platform === "win32";

describe.skipIf(!isWindows)("wslEnabled (Windows)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns true when includeWsl preference is true", async () => {
    const { getPreferenceValues } = await import("@raycast/api");
    vi.mocked(getPreferenceValues).mockReturnValue({ includeWsl: true });

    // Re-import to pick up fresh module state
    const { wslEnabled } = await import("./wsl");
    expect(wslEnabled()).toBe(true);
  });

  it("returns false when includeWsl preference is false", async () => {
    const { getPreferenceValues } = await import("@raycast/api");
    vi.mocked(getPreferenceValues).mockReturnValue({ includeWsl: false });

    const { wslEnabled } = await import("./wsl");
    expect(wslEnabled()).toBe(false);
  });
});

describe.skipIf(isWindows)("wslEnabled (non-Windows)", () => {
  it("returns false regardless of preferences", async () => {
    const { getPreferenceValues } = await import("@raycast/api");
    vi.mocked(getPreferenceValues).mockReturnValue({ includeWsl: true });

    const { wslEnabled } = await import("./wsl");
    expect(wslEnabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// listWslDistros — platform-dependent, mocked child_process
// ---------------------------------------------------------------------------

describe.skipIf(!isWindows)("listWslDistros (Windows)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns parsed distro names", async () => {
    vi.doMock("child_process", () => ({
      execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(null, "Ubuntu\r\nDebian\r\n");
      }),
      spawn: vi.fn(),
    }));

    const { listWslDistros } = await import("./wsl");
    const distros = await listWslDistros();
    expect(distros).toEqual(["Ubuntu", "Debian"]);
  });

  it("returns empty array on error", async () => {
    vi.doMock("child_process", () => ({
      execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (...args: unknown[]) => void) => {
        cb(new Error("not found"));
      }),
      spawn: vi.fn(),
    }));

    const { listWslDistros } = await import("./wsl");
    const distros = await listWslDistros();
    expect(distros).toEqual([]);
  });
});

describe.skipIf(isWindows)("listWslDistros (non-Windows)", () => {
  it("returns empty array", async () => {
    const { listWslDistros } = await import("./wsl");
    const distros = await listWslDistros();
    expect(distros).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// streamWslFiles — platform-dependent
// ---------------------------------------------------------------------------

describe.skipIf(isWindows)("streamWslFiles (non-Windows)", () => {
  it("resolves immediately without spawning", async () => {
    const { streamWslFiles } = await import("./wsl");
    const cb = { onFileStart: vi.fn(), onRecord: vi.fn(), onFileEnd: vi.fn() };
    await streamWslFiles("Ubuntu", "echo test", [], cb);
    expect(cb.onFileStart).not.toHaveBeenCalled();
    expect(cb.onRecord).not.toHaveBeenCalled();
    expect(cb.onFileEnd).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// `@raycast/api` is aliased to test/raycast-api.stub.ts (see vitest.config.ts),
// which exports environment.assetsPath = "/fake/assets".

vi.mock("node:fs", () => ({
  chmodSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { getDevices, getCurrent, setDevice } from "./audio";

const execFileMock = execFile as unknown as ReturnType<typeof vi.fn>;
const BINARY = "/fake/assets/audio-devices";

// Drive the mocked execFile via a handler that maps the CLI args it was called
// with to a fake { stdout, stderr, error } result, then invokes the callback.
function onRun(
  handler: (args: string[]) => {
    stdout?: string;
    stderr?: string;
    error?: Error;
  },
) {
  execFileMock.mockImplementation(
    (
      _file: string,
      args: string[],
      cb: (e: Error | null, out: string, err: string) => void,
    ) => {
      const { stdout = "", stderr = "", error = null } = handler(args);
      cb(error, stdout, stderr);
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDevices", () => {
  it("returns input devices with isCurrent flag set from the default", async () => {
    onRun((args) => {
      if (args[0] === "list") {
        return {
          stdout: JSON.stringify([
            { id: 1, name: "MacBook Mic" },
            { id: 2, name: "Shure MV7" },
          ]),
        };
      }
      // input get --json
      return { stdout: JSON.stringify({ id: 2, name: "Shure MV7" }) };
    });

    const devices = await getDevices("input");

    expect(devices).toEqual([
      { id: 1, name: "MacBook Mic", isCurrent: false },
      { id: 2, name: "Shure MV7", isCurrent: true },
    ]);
    // list uses the --input flag, current uses `input get`
    expect(execFileMock).toHaveBeenCalledWith(
      BINARY,
      ["list", "--input", "--json"],
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenCalledWith(
      BINARY,
      ["input", "get", "--json"],
      expect.any(Function),
    );
  });

  it("uses output CLI args for output type", async () => {
    onRun((args) => {
      if (args[0] === "list") {
        return { stdout: JSON.stringify([{ id: 5, name: "Studio Display" }]) };
      }
      return { stdout: JSON.stringify({ id: 5, name: "Studio Display" }) };
    });

    const devices = await getDevices("output");

    expect(devices).toEqual([
      { id: 5, name: "Studio Display", isCurrent: true },
    ]);
    expect(execFileMock).toHaveBeenCalledWith(
      BINARY,
      ["list", "--output", "--json"],
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenCalledWith(
      BINARY,
      ["output", "get", "--json"],
      expect.any(Function),
    );
    // never touched the input path
    expect(execFileMock).not.toHaveBeenCalledWith(
      BINARY,
      ["list", "--input", "--json"],
      expect.any(Function),
    );
  });

  it("a dual-role device appears in both lists with independent isCurrent", async () => {
    const dual = { id: 7, name: "USB Interface" };
    // input: dual is the current input; output: a different device is current
    onRun((args) => {
      if (args[0] === "list") return { stdout: JSON.stringify([dual]) };
      if (args[0] === "input")
        return { stdout: JSON.stringify({ id: 7, name: "USB Interface" }) };
      return { stdout: JSON.stringify({ id: 3, name: "MacBook Speakers" }) }; // output get
    });

    const inputs = await getDevices("input");
    const outputs = await getDevices("output");

    expect(inputs[0].isCurrent).toBe(true);
    expect(outputs[0].isCurrent).toBe(false);
  });

  it("rejects when the binary errors", async () => {
    onRun(() => ({ error: new Error("spawn ENOENT") }));
    await expect(getDevices("input")).rejects.toThrow("spawn ENOENT");
  });

  it("rejects when the binary writes to stderr", async () => {
    onRun((args) => (args[0] === "list" ? { stderr: "no audio access" } : {}));
    await expect(getDevices("input")).rejects.toThrow("no audio access");
  });
});

describe("getCurrent", () => {
  it("returns the default input device with isCurrent true", async () => {
    onRun(() => ({ stdout: JSON.stringify({ id: 2, name: "Shure MV7" }) }));
    const current = await getCurrent("input");
    expect(current).toEqual({ id: 2, name: "Shure MV7", isCurrent: true });
    expect(execFileMock).toHaveBeenCalledWith(
      BINARY,
      ["input", "get", "--json"],
      expect.any(Function),
    );
  });

  it("uses the output CLI path for output type", async () => {
    onRun(() => ({
      stdout: JSON.stringify({ id: 5, name: "Studio Display" }),
    }));
    const current = await getCurrent("output");
    expect(current).toEqual({ id: 5, name: "Studio Display", isCurrent: true });
    expect(execFileMock).toHaveBeenCalledWith(
      BINARY,
      ["output", "get", "--json"],
      expect.any(Function),
    );
    expect(execFileMock).not.toHaveBeenCalledWith(
      BINARY,
      ["input", "get", "--json"],
      expect.any(Function),
    );
  });

  it("propagates errors", async () => {
    onRun(() => ({ error: new Error("no default device") }));
    await expect(getCurrent("input")).rejects.toThrow("no default device");
  });
});

describe("setDevice", () => {
  it("calls `input set <id>` for input", async () => {
    onRun(() => ({}));
    await setDevice("input", 2);
    expect(execFileMock).toHaveBeenCalledWith(
      BINARY,
      ["input", "set", "2"],
      expect.any(Function),
    );
  });

  it("calls `output set <id>` for output", async () => {
    onRun(() => ({}));
    await setDevice("output", 5);
    expect(execFileMock).toHaveBeenCalledWith(
      BINARY,
      ["output", "set", "5"],
      expect.any(Function),
    );
  });

  it("propagates errors from the binary", async () => {
    onRun(() => ({ error: new Error("device gone") }));
    await expect(setDevice("input", 99)).rejects.toThrow("device gone");
  });
});

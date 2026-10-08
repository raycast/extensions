import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFile } from "node:child_process";
import {
  GUARD_SOURCE,
  KEY_DOWN_FLAGS,
  KEY_UP_FLAGS,
  MEDIA_KEY_CODES,
  SCRIPT,
  buildEventBlob,
  buildScriptArgs,
  expectedData1,
  sendMediaKey,
  type MediaKey,
} from "./media-keys";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);

const succeed = () => {
  mockExecFile.mockImplementation(((...args: unknown[]) => {
    const callback = args[args.length - 1] as (error: Error | null) => void;
    callback(null);
  }) as typeof execFile);
};

const failWithStderr = (stderr: string) => {
  mockExecFile.mockImplementation(((...args: unknown[]) => {
    const callback = args[args.length - 1] as (error: Error | null) => void;
    callback(Object.assign(new Error("command failed"), { stderr }));
  }) as typeof execFile);
};

describe("sendMediaKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    succeed();
  });

  it.each(Object.entries(MEDIA_KEY_CODES) as [MediaKey, number][])(
    "sends %s as osascript JXA with code %i",
    async (key, code) => {
      await sendMediaKey(key);

      expect(mockExecFile).toHaveBeenCalledOnce();
      expect(mockExecFile).toHaveBeenCalledWith(
        "osascript",
        ["-l", "JavaScript", "-e", SCRIPT, ...buildScriptArgs(code)],
        expect.any(Function),
      );
    },
  );

  it("maps not-trusted stderr to the Accessibility message", async () => {
    failWithStderr("execution error: Error: not-trusted (-2700)\n");

    await expect(sendMediaKey("play")).rejects.toThrow(
      "Raycast needs Accessibility access: System Settings → Privacy & Security → Accessibility",
    );
  });

  it("passes other stderr through trimmed", async () => {
    failWithStderr("  some failure  \n");

    await expect(sendMediaKey("next")).rejects.toThrow("some failure");
  });

  it("falls back when stderr is empty", async () => {
    failWithStderr("");

    await expect(sendMediaKey("rewind")).rejects.toThrow("failed to send media key: rewind");
  });
});

describe("buildEventBlob", () => {
  const decode = (code: number, flags: number) => Buffer.from(buildEventBlob(code, flags), "base64");

  it("keeps the template length", () => {
    expect(decode(17, KEY_DOWN_FLAGS)).toHaveLength(176);
  });

  it.each([
    ["down", KEY_DOWN_FLAGS],
    ["up", KEY_UP_FLAGS],
  ])("patches flags and data1 big-endian for key %s", (_name, flags) => {
    const bytes = decode(17, flags);

    expect(bytes.readUInt32BE(0x44)).toBe(flags);
    expect(bytes.readUInt32BE(0x74)).toBe(((17 << 16) | flags) >>> 0);
  });

  it("changes nothing outside the patched offsets", () => {
    const a = decode(16, KEY_DOWN_FLAGS);
    const b = decode(20, KEY_UP_FLAGS);
    const differing = a.reduce<number[]>((acc, byte, i) => (byte === b[i] ? acc : [...acc, i]), []);

    expect(differing.every((i) => (i >= 0x44 && i < 0x48) || (i >= 0x74 && i < 0x78))).toBe(true);
  });

  it("computes the expected data1 as (code<<16)|flags", () => {
    expect(expectedData1(17, KEY_DOWN_FLAGS)).toBe(0x110a00);
    expect(expectedData1(20, KEY_UP_FLAGS)).toBe(0x140b00);
  });
});

describe("buildScriptArgs", () => {
  it("passes down blob, up blob, then both expected data1 values", () => {
    expect(buildScriptArgs(17)).toEqual([
      buildEventBlob(17, KEY_DOWN_FLAGS),
      buildEventBlob(17, KEY_UP_FLAGS),
      String(0x110a00),
      String(0x110b00),
    ]);
  });
});

describe("read-back guard", () => {
  const isExpected = new Function(`${GUARD_SOURCE}; return isExpectedMediaKeyEvent;`)() as (
    type: unknown,
    subtype: unknown,
    data1: unknown,
    flags: unknown,
    expected: unknown,
  ) => boolean;

  it("accepts a matching media key event", () => {
    expect(isExpected(14, 8, 0x110a00, 0xa00, String(0x110a00))).toBe(true);
  });

  it("compares boxed values numerically", () => {
    expect(isExpected(new Number(14), new Number(8), new Number(0x110a00), new Number(0xa00), 0x110a00)).toBe(true);
  });

  it.each([
    ["wrong type", 0, 8, 0x110a00, 0xa00],
    ["wrong subtype", 14, 7, 0x110a00, 0xa00],
    ["wrong data1", 14, 8, 0x120a00, 0xa00],
    ["key-up flags on a key-down", 14, 8, 0x110a00, 0xb00],
  ])("rejects %s", (_name, type, subtype, data1, flags) => {
    expect(isExpected(type, subtype, data1, flags, 0x110a00)).toBe(false);
  });

  it("is wired into the script before posting", () => {
    const guardCall = SCRIPT.indexOf("if (!isExpectedMediaKeyEvent(");
    expect(guardCall).toBeGreaterThan(-1);
    expect(guardCall).toBeLessThan(SCRIPT.indexOf("CGEventPost("));
    expect(SCRIPT).toContain("CGEventCreateFromData");
  });
});

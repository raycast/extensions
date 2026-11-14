/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAvailableWindowsLanguages,
  getWindowsRecognitionLanguage,
  recognizeWindows,
  setWindowsRecognitionLanguage,
} from "./windows";

const { execFileMock, storageMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  storageMock: { getItem: vi.fn(), setItem: vi.fn() },
}));

vi.mock("@raycast/api", () => ({
  environment: { assetsPath: "/assets" },
  LocalStorage: storageMock,
}));
vi.mock("node:child_process", () => ({ execFile: execFileMock }));

interface FakeExecError extends Error {
  code?: number | string;
  killed?: boolean;
  signal?: string | null;
}

type ExecCallback = (error: FakeExecError | null, stdout: string, stderr: string) => void;

const scriptPath = path.join("/assets", "ocr.ps1");

function mockExecution(handler: (args: string[], options: unknown, callback: ExecCallback) => void) {
  execFileMock.mockImplementation((...callArguments: unknown[]) => {
    const [file, args, options, callback] = callArguments;
    expect(typeof file).toBe("string");
    handler(args as string[], options, callback as ExecCallback);
    return undefined;
  });
}

function recognizedPayload(text: string): string {
  return JSON.stringify({ status: "recognized", text });
}

function exitError(code: number | string, extra?: Partial<FakeExecError>): FakeExecError {
  return Object.assign(new Error(`exit ${code}`), { code, ...extra });
}

beforeEach(() => {
  execFileMock.mockReset();
  storageMock.getItem.mockReset().mockResolvedValue(undefined);
  storageMock.setItem.mockReset().mockResolvedValue(undefined);
});

describe("recognizeWindows", () => {
  it("recognizes text through the bundled helper with the saved language", async () => {
    storageMock.getItem.mockResolvedValue("zh-Hans-CN");
    mockExecution((args, options, callback) => {
      expect(args).toEqual([
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-STA",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-Mode",
        "area",
        "-Language",
        "zh-Hans-CN",
      ]);
      expect(options).toMatchObject({ encoding: "utf8", windowsHide: true, timeout: 300_000 });
      callback(null, recognizedPayload("你好 world"), "");
    });

    await expect(recognizeWindows("area")).resolves.toEqual({ status: "recognized", text: "你好 world" });
  });

  it("defaults to auto and reports no text", async () => {
    mockExecution((args, _options, callback) => {
      expect(args).toContain("auto");
      callback(null, JSON.stringify({ status: "no-text" }), "");
    });

    await expect(recognizeWindows("area")).resolves.toEqual({ status: "no-text" });
  });

  it("uses the default timeout for non-area modes", async () => {
    mockExecution((args, options, callback) => {
      expect(args.slice(-4)).toEqual(["-Mode", "fullscreen", "-Language", "auto"]);
      expect(options).toMatchObject({ timeout: 90_000 });
      callback(null, recognizedPayload("fullscreen text"), "");
    });

    await expect(recognizeWindows("fullscreen")).resolves.toEqual({
      status: "recognized",
      text: "fullscreen text",
    });
  });

  it("reports cancellation when the user closes the selection overlay", async () => {
    mockExecution((_args, _options, callback) => callback(exitError(2), "", ""));

    await expect(recognizeWindows("area")).resolves.toEqual({ status: "cancelled" });
  });

  it("explains a missing auto OCR engine", async () => {
    mockExecution((_args, _options, callback) => callback(exitError(3), "", ""));

    await expect(recognizeWindows("area")).resolves.toMatchObject({
      status: "error",
      message: expect.stringMatching(/profile languages/),
    });
  });

  it("explains a missing pinned OCR language pack", async () => {
    storageMock.getItem.mockResolvedValue("ja-JP");
    mockExecution((_args, _options, callback) => callback(exitError(3), "", ""));

    await expect(recognizeWindows("area")).resolves.toMatchObject({
      status: "error",
      message: expect.stringMatching(/ja-JP is not installed/),
    });
  });

  it("rejects an invalid saved language before starting PowerShell", async () => {
    storageMock.getItem.mockResolvedValue("not a tag!");

    await expect(recognizeWindows("area")).resolves.toMatchObject({
      status: "error",
      message: expect.stringMatching(/invalid/i),
    });
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("maps clipboard error payloads from the helper", async () => {
    mockExecution((_args, _options, callback) =>
      callback(exitError(4), JSON.stringify({ status: "error", code: "clipboard-empty" }), ""),
    );

    await expect(recognizeWindows("clipboard")).resolves.toMatchObject({
      status: "error",
      message: expect.stringMatching(/does not contain an image/),
    });
  });

  it("reports a capture that is already in progress", async () => {
    mockExecution((_args, _options, callback) => callback(exitError(6), "", ""));

    await expect(recognizeWindows("area")).resolves.toMatchObject({
      status: "error",
      message: expect.stringMatching(/already in progress/),
    });
  });

  it("rejects a helper response that is not JSON", async () => {
    mockExecution((_args, _options, callback) => callback(null, "not json", ""));

    await expect(recognizeWindows("area")).resolves.toMatchObject({
      status: "error",
      message: expect.stringMatching(/invalid response/),
    });
  });

  it("rejects a recognized payload without text", async () => {
    mockExecution((_args, _options, callback) => callback(null, JSON.stringify({ status: "recognized" }), ""));

    await expect(recognizeWindows("area")).resolves.toMatchObject({
      status: "error",
      message: expect.stringMatching(/invalid result/),
    });
  });

  it("maps process failures to user-facing errors", async () => {
    mockExecution((_args, _options, callback) => callback(exitError("ENOENT"), "", ""));
    await expect(recognizeWindows("area")).resolves.toMatchObject({
      message: expect.stringMatching(/PowerShell 5\.1 could not be started/),
    });

    execFileMock.mockReset();
    mockExecution((_args, _options, callback) => callback(exitError("ETIMEDOUT", { killed: true }), "", ""));
    await expect(recognizeWindows("area")).resolves.toMatchObject({
      message: expect.stringMatching(/timed out/),
    });

    execFileMock.mockReset();
    mockExecution((_args, _options, callback) => callback(exitError("ERR_CHILD_PROCESS_STDIO_MAXBUFFER"), "", ""));
    await expect(recognizeWindows("area")).resolves.toMatchObject({
      message: expect.stringMatching(/size limit/),
    });
  });
});

describe("Windows OCR language storage", () => {
  it("defaults to auto when nothing is saved", async () => {
    await expect(getWindowsRecognitionLanguage()).resolves.toBe("auto");
  });

  it("returns the saved language", async () => {
    storageMock.getItem.mockResolvedValue("ko-KR");

    await expect(getWindowsRecognitionLanguage()).resolves.toBe("ko-KR");
  });

  it("validates the language tag before saving", async () => {
    await expect(setWindowsRecognitionLanguage("bad tag!")).rejects.toThrow(/invalid/i);
    expect(storageMock.setItem).not.toHaveBeenCalled();

    await setWindowsRecognitionLanguage("en-GB");
    expect(storageMock.setItem).toHaveBeenCalledWith("WindowsRecognitionLanguage", "en-GB");
  });
});

describe("getAvailableWindowsLanguages", () => {
  it("parses the installed OCR language inventory", async () => {
    mockExecution((args, options, callback) => {
      expect(args.at(-1)).toBe("-ListLanguages");
      expect(options).toMatchObject({ timeout: 15_000 });
      callback(
        null,
        JSON.stringify({
          status: "languages",
          languages: [
            { tag: "zh-Hans-CN", displayName: "中文 (简体)" },
            { tag: "en-US", displayName: "English (United States)" },
          ],
        }),
        "",
      );
    });

    await expect(getAvailableWindowsLanguages()).resolves.toEqual([
      { tag: "zh-Hans-CN", displayName: "中文 (简体)" },
      { tag: "en-US", displayName: "English (United States)" },
    ]);
  });

  it("rejects duplicate or malformed language entries", async () => {
    const cases = [
      {
        tagA: "en-US",
        tagB: "EN-us",
        displayName: "English (United States)",
      },
      {
        tagA: "en-US",
        tagB: "not a tag",
        displayName: "English (United States)",
      },
      {
        tagA: "en-US",
        tagB: "ja-JP",
        displayName: " ",
      },
    ];

    for (const { tagA, tagB, displayName } of cases) {
      execFileMock.mockReset();
      mockExecution((_args, _options, callback) =>
        callback(
          null,
          JSON.stringify({
            status: "languages",
            languages: [
              { tag: tagA, displayName },
              { tag: tagB, displayName },
            ],
          }),
          "",
        ),
      );

      await expect(getAvailableWindowsLanguages()).rejects.toThrow(/invalid language list/);
    }
  });

  it("maps helper failures and invalid payloads to load errors", async () => {
    mockExecution((_args, _options, callback) => callback(exitError(3), "", ""));
    await expect(getAvailableWindowsLanguages()).rejects.toThrow(/profile languages/);

    execFileMock.mockReset();
    mockExecution((_args, _options, callback) => callback(null, "not json", ""));
    await expect(getAvailableWindowsLanguages()).rejects.toThrow(/invalid response/);
  });
});

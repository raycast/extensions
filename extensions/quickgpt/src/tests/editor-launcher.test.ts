import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import {
  getEditorDisplayName,
  isEditorConfigured,
  normalizeEditorApp,
  openPathWithEditor,
  openPromptFileWithEditor,
  resolveEditorLineInvocation,
} from "../utils/editor-launcher";

jest.mock("child_process", () => ({
  ...jest.requireActual("child_process"),
  execFile: jest.fn((...args: unknown[]) => {
    const callback = args[args.length - 1] as (error: Error | null, stdout: string, stderr: string) => void;
    callback(null, "", "");
  }),
}));

const execFileMock = execFile as unknown as jest.Mock;

function makeExecutable(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "#!/bin/sh\nexit 0\n");
  fs.chmodSync(filePath, 0o755);
}

describe("resolveEditorLineInvocation", () => {
  let rootDirectory: string;
  const workspaceDir = "/tmp/workspace";
  const filePath = "/tmp/workspace/prompts/demo.hjson";

  beforeEach(() => {
    rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "quickgpt-editor-"));
  });

  afterEach(() => {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  });

  it("uses --goto for VS Code family editors and skips tunnel binaries", () => {
    const appPath = path.join(rootDirectory, "Fake Code.app");
    makeExecutable(path.join(appPath, "Contents", "Resources", "app", "bin", "code"));
    makeExecutable(path.join(appPath, "Contents", "Resources", "app", "bin", "code-tunnel"));

    const invocation = resolveEditorLineInvocation(appPath, workspaceDir, filePath, 42);

    expect(invocation).toEqual({
      command: path.join(appPath, "Contents", "Resources", "app", "bin", "code"),
      args: [workspaceDir, "--goto", `${filePath}:42`],
    });
  });

  it("supports Cursor-style forks whose CLI is not named code", () => {
    const appPath = path.join(rootDirectory, "Dancer.app");
    makeExecutable(path.join(appPath, "Contents", "Resources", "app", "bin", "cursor"));
    makeExecutable(path.join(appPath, "Contents", "Resources", "app", "bin", "cursor-tunnel"));

    const invocation = resolveEditorLineInvocation(appPath, workspaceDir, filePath, 7);

    expect(invocation).toEqual({
      command: path.join(appPath, "Contents", "Resources", "app", "bin", "cursor"),
      args: [workspaceDir, "--goto", `${filePath}:7`],
    });
  });

  it("uses the subl CLI with file:line for Sublime Text", () => {
    const appPath = path.join(rootDirectory, "Sublime Text.app");
    makeExecutable(path.join(appPath, "Contents", "SharedSupport", "bin", "subl"));

    const invocation = resolveEditorLineInvocation(appPath, workspaceDir, filePath, 12);

    expect(invocation).toEqual({
      command: path.join(appPath, "Contents", "SharedSupport", "bin", "subl"),
      args: [workspaceDir, `${filePath}:12`],
    });
  });

  it("uses the bundled cli with file:line for Zed", () => {
    const appPath = path.join(rootDirectory, "Zed.app");
    makeExecutable(path.join(appPath, "Contents", "MacOS", "cli"));
    fs.writeFileSync(path.join(appPath, "Contents", "MacOS", "zed"), "binary");

    const invocation = resolveEditorLineInvocation(appPath, workspaceDir, filePath, 3);

    expect(invocation).toEqual({
      command: path.join(appPath, "Contents", "MacOS", "cli"),
      args: [workspaceDir, `${filePath}:3`],
    });
  });

  it("returns undefined for editors without a known line-capable CLI", () => {
    const appPath = path.join(rootDirectory, "TextEdit.app");
    fs.mkdirSync(path.join(appPath, "Contents", "MacOS"), { recursive: true });

    expect(resolveEditorLineInvocation(appPath, workspaceDir, filePath, 5)).toBeUndefined();
  });
});

describe("openPromptFileWithEditor", () => {
  let rootDirectory: string;
  let workspaceDir: string;
  let filePath: string;

  beforeEach(() => {
    execFileMock.mockClear();
    rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "quickgpt-editor-open-"));
    workspaceDir = path.join(rootDirectory, "repo");
    fs.mkdirSync(path.join(workspaceDir, ".git"), { recursive: true });
    fs.mkdirSync(path.join(workspaceDir, "prompts"));
    filePath = path.join(workspaceDir, "prompts", "demo.hjson");
    fs.writeFileSync(filePath, "{}");
  });

  afterEach(() => {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  });

  function makeVSCodeFamilyApp(): { appPath: string; cliPath: string } {
    const appPath = path.join(rootDirectory, "Fake Code.app");
    const cliPath = path.join(appPath, "Contents", "Resources", "app", "bin", "code");
    makeExecutable(cliPath);
    return { appPath, cliPath };
  }

  it("opens at the line through the editor CLI and reports openedAtLine", async () => {
    const { appPath, cliPath } = makeVSCodeFamilyApp();

    const result = await openPromptFileWithEditor({ name: "Fake Code", path: appPath }, filePath, 42);

    expect(result).toEqual({ openedAtLine: true });
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0][0]).toBe(cliPath);
    expect(execFileMock.mock.calls[0][1]).toEqual([workspaceDir, "--goto", `${filePath}:42`]);
  });

  it("falls back to open without a line for editors without a known CLI", async () => {
    const appPath = path.join(rootDirectory, "TextEdit.app");
    fs.mkdirSync(path.join(appPath, "Contents", "MacOS"), { recursive: true });

    const result = await openPromptFileWithEditor(
      { name: "TextEdit", path: appPath, bundleId: "com.apple.TextEdit" },
      filePath,
      42,
    );

    expect(result).toEqual({ openedAtLine: false });
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0][0]).toBe("open");
    expect(execFileMock.mock.calls[0][1]).toEqual(["-b", "com.apple.TextEdit", workspaceDir, filePath]);
  });

  it("falls back to open when no line number is known", async () => {
    const { appPath } = makeVSCodeFamilyApp();

    const result = await openPromptFileWithEditor({ name: "Fake Code", path: appPath }, filePath, undefined);

    expect(result).toEqual({ openedAtLine: false });
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0][0]).toBe("open");
  });

  it("opens only the file with the system default app when no editor is configured", async () => {
    const result = await openPromptFileWithEditor(undefined, filePath, 42);

    expect(result).toEqual({ openedAtLine: false });
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0][0]).toBe("open");
    expect(execFileMock.mock.calls[0][1]).toEqual([filePath]);
  });

  it("opens only the file when the editor preference is an empty app picker value", async () => {
    const result = await openPromptFileWithEditor({ name: "", path: "", bundleId: "" }, filePath, 12);

    expect(result).toEqual({ openedAtLine: false });
    expect(execFileMock.mock.calls[0][1]).toEqual([filePath]);
  });

  it("falls back to open when the CLI invocation fails", async () => {
    const { appPath } = makeVSCodeFamilyApp();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    execFileMock.mockImplementationOnce((...args: unknown[]) => {
      const callback = args[args.length - 1] as (error: Error | null, stdout: string, stderr: string) => void;
      callback(new Error("cli crashed"), "", "");
    });

    try {
      const result = await openPromptFileWithEditor({ name: "Fake Code", path: appPath }, filePath, 42);

      expect(result).toEqual({ openedAtLine: false });
      expect(execFileMock).toHaveBeenCalledTimes(2);
      expect(execFileMock.mock.calls[1][0]).toBe("open");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

describe("editor preference helpers", () => {
  it("treats empty app picker values as unconfigured", () => {
    expect(isEditorConfigured(undefined)).toBe(false);
    expect(isEditorConfigured({ name: "", path: "", bundleId: "" })).toBe(false);
    expect(normalizeEditorApp({ name: "", path: "" })).toBeUndefined();
    expect(getEditorDisplayName(undefined)).toBe("Default App");
  });

  it("uses the app name without a .app suffix when configured", () => {
    const editor = { name: "Cursor.app", path: "/Applications/Cursor.app", bundleId: "com.todesktop.230313mzl4w4u92" };
    expect(isEditorConfigured(editor)).toBe(true);
    expect(normalizeEditorApp(editor)).toEqual(editor);
    expect(getEditorDisplayName(editor)).toBe("Cursor");
  });
});

describe("openPathWithEditor", () => {
  beforeEach(() => {
    execFileMock.mockClear();
  });

  it("opens a directory with the system default app when no editor is set", async () => {
    await openPathWithEditor(undefined, "/tmp/prompts");

    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0][0]).toBe("open");
    expect(execFileMock.mock.calls[0][1]).toEqual(["/tmp/prompts"]);
  });

  it("opens a directory with the configured editor bundle id", async () => {
    await openPathWithEditor({ name: "TextEdit", bundleId: "com.apple.TextEdit" }, "/tmp/prompts");

    expect(execFileMock.mock.calls[0][1]).toEqual(["-b", "com.apple.TextEdit", "/tmp/prompts"]);
  });
});

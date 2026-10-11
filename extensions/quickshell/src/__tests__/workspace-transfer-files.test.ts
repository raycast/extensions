import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EXPORT_FILE_NAME,
  buildMacTransferOsascript,
  buildWindowsTransferPowerShell,
  pickWorkspaceTransferJsonPath,
  readWorkspaceImportFile,
  selectedPathFromDialogStdout,
  writeWorkspaceExportFile,
} from "../lib/workspace-transfer-files";

const { execFileMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { promisify } = require("node:util") as typeof import("node:util");
  const execFileMock = vi.fn();
  // Preserve Node's execFile promisify contract ({ stdout, stderr }) for success paths.
  const withCustom = execFileMock as typeof execFileMock & Record<symbol, unknown>;
  withCustom[promisify.custom] = (file: unknown, args: unknown, options: unknown) =>
    new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFileMock(
        file as string,
        args as string[],
        options as object,
        (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => {
          if (error) {
            Object.assign(error, { stdout, stderr });
            reject(error);
            return;
          }
          resolve({ stdout: String(stdout), stderr: String(stderr) });
        },
      );
    });
  return { execFileMock };
});

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

vi.mock("../lib/platform", () => ({
  isWindowsPlatform: vi.fn(() => true),
  isMacPlatform: vi.fn(() => false),
}));

describe("workspace-transfer-files", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    execFileMock.mockReset();
  });

  it("writes and reads UTF-8 JSON round-trip", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qs-transfer-"));
    dirs.push(dir);
    const filePath = path.join(dir, DEFAULT_EXPORT_FILE_NAME);
    const json = '{"version":1,"workspaces":[]}';

    writeWorkspaceExportFile(filePath, json);

    expect(readFileSync(filePath, "utf8")).toBe(json);
    expect(readWorkspaceImportFile(filePath)).toBe(json);
  });

  it("seeds Windows dialogs on the Desktop for faster first paint", () => {
    expect(buildWindowsTransferPowerShell("open")).toContain("GetFolderPath('Desktop')");
    expect(buildWindowsTransferPowerShell("save")).toContain("GetFolderPath('Desktop')");
  });

  it("writes the selected path before reactivating Raycast on Windows", () => {
    const windowsOpen = buildWindowsTransferPowerShell("open");
    const writeIndex = windowsOpen.indexOf("[Console]::Out.Write($selected)");
    const activateIndex = windowsOpen.indexOf("AppActivate");
    expect(writeIndex).toBeGreaterThan(-1);
    expect(activateIndex).toBeGreaterThan(-1);
    expect(writeIndex).toBeLessThan(activateIndex);
    expect(windowsOpen).toContain("catch [System.Runtime.InteropServices.COMException]");
    expect(windowsOpen).not.toContain("catch {}");
  });

  it("reactivates Raycast after Windows and macOS file dialogs", () => {
    const windowsOpen = buildWindowsTransferPowerShell("open");
    const windowsSave = buildWindowsTransferPowerShell("save");
    expect(windowsOpen).toContain("AppActivate");
    expect(windowsSave).toContain("AppActivate");

    const macOpen = buildMacTransferOsascript("open");
    const macSave = buildMacTransferOsascript("save");
    expect(macOpen).toContain('tell application "Raycast" to activate');
    expect(macSave).toContain('tell application "Raycast" to activate');
    expect(macOpen).toContain("errNum is not in {-600, -1728, -10810}");
    // Activation is best-effort and must not discard a valid selection.
    expect(macOpen.indexOf("end try")).toBeLessThan(macOpen.lastIndexOf('tell application "Raycast" to activate'));
    expect(macOpen.indexOf('tell application "Raycast" to activate')).toBeLessThan(
      macOpen.lastIndexOf("return chosenPath"),
    );
  });

  it("resolves a selected path from dialog stdout", () => {
    expect(selectedPathFromDialogStdout("C:\\Users\\dev\\export.json\n")).toBe(
      path.resolve("C:\\Users\\dev\\export.json"),
    );
    expect(selectedPathFromDialogStdout("   ")).toBeNull();
    expect(selectedPathFromDialogStdout(undefined)).toBeNull();
  });

  it("keeps a Windows selection when the shell fails after writing stdout", async () => {
    const selected = path.join(tmpdir(), "kept-export.json");
    execFileMock.mockImplementation(((
      _file: string,
      argsOrOptions: unknown,
      optionsOrCallback: unknown,
      maybeCallback?: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const callback =
        typeof optionsOrCallback === "function"
          ? (optionsOrCallback as (error: Error | null, stdout: string, stderr: string) => void)
          : maybeCallback;
      const args = Array.isArray(argsOrOptions) ? argsOrOptions.map(String) : [];
      const isDialog = args.some((arg) => arg.includes("SaveFileDialog") || arg.includes("OpenFileDialog"));
      if (!callback) {
        throw new Error("execFile mock missing callback");
      }
      if (isDialog) {
        const error = Object.assign(new Error("Command failed"), { code: 1 });
        callback(error, `${selected}\n`, "");
        return {} as never;
      }
      callback(null, "", "");
      return {} as never;
    }) as unknown as typeof execFile);

    const result = await pickWorkspaceTransferJsonPath("save");
    expect(result).toBe(path.resolve(selected));
  });

  it("falls through from missing pwsh to powershell.exe", async () => {
    const selected = path.join(tmpdir(), "pwsh-fallback.json");
    const dialogShells: string[] = [];
    execFileMock.mockImplementation(((
      file: string,
      argsOrOptions: unknown,
      optionsOrCallback: unknown,
      maybeCallback?: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const callback =
        typeof optionsOrCallback === "function"
          ? (optionsOrCallback as (error: Error | null, stdout: string, stderr: string) => void)
          : maybeCallback;
      const args = Array.isArray(argsOrOptions) ? argsOrOptions.map(String) : [];
      const isDialog = args.some((arg) => arg.includes("SaveFileDialog") || arg.includes("OpenFileDialog"));
      if (!callback) {
        throw new Error("execFile mock missing callback");
      }
      if (!isDialog) {
        callback(null, "", "");
        return {} as never;
      }
      dialogShells.push(file);
      if (file === "pwsh") {
        const error = Object.assign(new Error("not found"), { code: "ENOENT" });
        callback(error, "", "");
        return {} as never;
      }
      callback(null, `${selected}\n`, "");
      return {} as never;
    }) as unknown as typeof execFile);

    const result = await pickWorkspaceTransferJsonPath("open");
    expect(dialogShells).toEqual(["pwsh", "powershell.exe"]);
    expect(result).toBe(path.resolve(selected));
  });

  it("falls through from non-ENOENT pwsh failure to powershell.exe", async () => {
    const selected = path.join(tmpdir(), "pwsh-runtime-fallback.json");
    const dialogShells: string[] = [];
    execFileMock.mockImplementation(((
      file: string,
      argsOrOptions: unknown,
      optionsOrCallback: unknown,
      maybeCallback?: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const callback =
        typeof optionsOrCallback === "function"
          ? (optionsOrCallback as (error: Error | null, stdout: string, stderr: string) => void)
          : maybeCallback;
      const args = Array.isArray(argsOrOptions) ? argsOrOptions.map(String) : [];
      const isDialog = args.some((arg) => arg.includes("SaveFileDialog") || arg.includes("OpenFileDialog"));
      if (!callback) {
        throw new Error("execFile mock missing callback");
      }
      if (!isDialog) {
        callback(null, "", "");
        return {} as never;
      }
      dialogShells.push(file);
      if (file === "pwsh") {
        const error = Object.assign(new Error("Add-Type failed"), { code: 1 });
        callback(error, "", "");
        return {} as never;
      }
      callback(null, `${selected}\n`, "");
      return {} as never;
    }) as unknown as typeof execFile);

    const result = await pickWorkspaceTransferJsonPath("open");
    expect(dialogShells).toEqual(["pwsh", "powershell.exe"]);
    expect(result).toBe(path.resolve(selected));
  });
});

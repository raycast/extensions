import type { PathLike } from "fs";
import { describe, expect, it, vi } from "vitest";
import { BrowserBootstrapRequiredError } from "../../utils/browser-errors";
import { renderWithMmdc } from "../mmdc";
import { mapMmdcError } from "../mmdc-error";

describe("mapMmdcError", () => {
  it("shows actionable guidance when Chrome is missing for Puppeteer", () => {
    const commandError = Object.assign(new Error("Command failed"), {
      stderr:
        "Error: Could not find Chrome (ver. 131.0.6778.204). This can occur if either 1. you did not perform an installation",
    });

    const mapped = mapMmdcError(commandError);

    expect(mapped.message).toContain("Compatible rendering could not launch its browser");
    expect(mapped.message).toContain("Download Browser");
  });
});

describe("renderWithMmdc", () => {
  it("passes a puppeteer config file with the resolved executablePath", async () => {
    const tempFiles = new Map<string, string>();
    const createTempFile = vi.fn((content: string, extension: string) => {
      const tempPath = `/tmp/test-${tempFiles.size}.${extension}`;
      tempFiles.set(tempPath, content);
      return tempPath;
    });
    const cleanupTempFile = vi.fn();
    const execFile = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });

    const outputPath = "/tmp/output.png";
    const request = {
      code: "flowchart TD\nA-->B",
      format: "png" as const,
      requestedEngine: "compatible" as const,
      outputPath,
    };

    await renderWithMmdc(
      request,
      {
        preferences: {
          outputFormat: "png",
          renderEngine: "compatible",
          theme: "default",
        },
        timeoutMs: 5_000,
      },
      {
        createTempFile,
        cleanupTempFile,
        locateNodeExecutable: vi.fn().mockResolvedValue("/opt/homebrew/bin/node"),
        locateMmdcExecutable: vi.fn().mockResolvedValue("/opt/homebrew/bin/mmdc"),
        resolveCompatibleBrowser: vi.fn().mockResolvedValue({
          source: "environment",
          executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        }),
        execFile,
        fileExists: vi.fn((target: PathLike) => String(target) === outputPath),
      },
    );

    const puppeteerConfigPath = [...tempFiles.keys()].find((filePath) => filePath.endsWith(".json"));

    expect(puppeteerConfigPath).toBeDefined();
    expect(execFile).toHaveBeenCalledWith(
      "/opt/homebrew/bin/node",
      expect.arrayContaining(["--puppeteerConfigFile", puppeteerConfigPath]),
      expect.objectContaining({ timeout: 5_000 }),
    );
    expect(JSON.parse(tempFiles.get(puppeteerConfigPath!) ?? "")).toEqual({
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });
    expect(cleanupTempFile).toHaveBeenCalledWith("/tmp/test-0.mmd");
    expect(cleanupTempFile).toHaveBeenCalledWith(puppeteerConfigPath);
  });

  it("raises BrowserBootstrapRequiredError when no browser can be resolved", async () => {
    await expect(
      renderWithMmdc(
        {
          code: "flowchart TD\nA-->B",
          format: "png",
          requestedEngine: "compatible",
          outputPath: "/tmp/output.png",
        },
        {
          preferences: {
            outputFormat: "png",
            renderEngine: "compatible",
            theme: "default",
          },
          timeoutMs: 5_000,
        },
        {
          createTempFile: vi.fn().mockReturnValue("/tmp/test-0.mmd"),
          cleanupTempFile: vi.fn(),
          locateNodeExecutable: vi.fn().mockResolvedValue("/opt/homebrew/bin/node"),
          locateMmdcExecutable: vi.fn().mockResolvedValue("/opt/homebrew/bin/mmdc"),
          resolveCompatibleBrowser: vi.fn().mockResolvedValue({
            source: "missing",
          }),
          execFile: vi.fn(),
          fileExists: vi.fn().mockReturnValue(false),
        },
      ),
    ).rejects.toBeInstanceOf(BrowserBootstrapRequiredError);
  });
});

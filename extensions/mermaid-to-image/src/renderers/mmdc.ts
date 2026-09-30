import fs from "fs";
import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";
import { MutableRefObject } from "react";
import { cleanupTempFile, createTempFile } from "../utils/files";
import { findMmdcPath, findNodePath } from "../utils/executables";
import { BrowserBootstrapRequiredError } from "../utils/browser-errors";
import { resolveCompatibleBrowser } from "../utils/browser-manager";
import { Preferences } from "../types";
import { DiagramRequest, DiagramResult } from "./types";
import { mapMmdcError } from "./mmdc-error";

const execFilePromise = promisify(execFile);

export interface MmdcRenderOptions {
  preferences: Preferences;
  timeoutMs: number;
  scale?: number;
  width?: number;
  height?: number;
  tempFileRef?: MutableRefObject<string | null>;
}

interface MmdcRenderDependencies {
  createTempFile: typeof createTempFile;
  cleanupTempFile: typeof cleanupTempFile;
  locateNodeExecutable: typeof findNodePath;
  locateMmdcExecutable: typeof findMmdcPath;
  resolveCompatibleBrowser: typeof resolveCompatibleBrowser;
  execFile: typeof execFilePromise;
  fileExists: typeof fs.existsSync;
}

function createMmdcRenderDependencies(): MmdcRenderDependencies {
  return {
    createTempFile,
    cleanupTempFile,
    locateNodeExecutable: findNodePath,
    locateMmdcExecutable: findMmdcPath,
    resolveCompatibleBrowser,
    execFile: execFilePromise,
    fileExists: fs.existsSync,
  };
}

function setTempRef(tempFileRef: MutableRefObject<string | null> | undefined, value: string | null): void {
  if (tempFileRef) {
    tempFileRef.current = value;
  }
}

function cleanupInputFile(
  inputPath: string,
  tempFileRef: MutableRefObject<string | null> | undefined,
  cleanupTempPath: (tempPath: string) => void,
): void {
  cleanupTempPath(inputPath);
  setTempRef(tempFileRef, null);
}

export async function renderWithMmdc(
  request: DiagramRequest,
  options: MmdcRenderOptions,
  dependencies: MmdcRenderDependencies = createMmdcRenderDependencies(),
): Promise<DiagramResult> {
  const inputFile = dependencies.createTempFile(request.code, "mmd");
  let puppeteerConfigFile: string | null = null;
  setTempRef(options.tempFileRef, inputFile);

  try {
    const nodePath = await dependencies.locateNodeExecutable();
    const mmdcPath = await dependencies.locateMmdcExecutable(options.preferences);
    const browser = await dependencies.resolveCompatibleBrowser();

    if (!browser.executablePath) {
      throw new BrowserBootstrapRequiredError();
    }

    puppeteerConfigFile = dependencies.createTempFile(
      JSON.stringify({
        executablePath: browser.executablePath,
      }),
      "json",
    );

    const args = [
      mmdcPath,
      "-i",
      inputFile,
      "-o",
      request.outputPath,
      "-t",
      options.preferences.theme,
      "-b",
      "transparent",
      "--scale",
      String(options.scale ?? 4),
      "--puppeteerConfigFile",
      puppeteerConfigFile,
    ];

    if (options.width) {
      args.push("--width", String(options.width));
    }
    if (options.height) {
      args.push("--height", String(options.height));
    }

    const env = {
      ...process.env,
      NODE_OPTIONS: "--max-old-space-size=4096",
      PATH: `${path.dirname(nodePath)}${path.delimiter}/usr/local/bin${path.delimiter}/opt/homebrew/bin${path.delimiter}${process.env.PATH || ""}`,
    };

    await dependencies.execFile(nodePath, args, { env, timeout: options.timeoutMs });

    if (!dependencies.fileExists(request.outputPath)) {
      throw new Error("Output file not found");
    }

    return {
      engine: "mmdc",
      format: request.format,
      outputPath: request.outputPath,
      svgRasterStrategy: request.format === "svg" ? "macos" : undefined,
    };
  } catch (error: unknown) {
    if (error instanceof BrowserBootstrapRequiredError) {
      throw error;
    }
    throw mapMmdcError(error);
  } finally {
    cleanupInputFile(inputFile, options.tempFileRef, dependencies.cleanupTempFile);
    if (puppeteerConfigFile) {
      dependencies.cleanupTempFile(puppeteerConfigFile);
    }
  }
}

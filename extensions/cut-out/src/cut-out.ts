import {
  PopToRootType,
  Toast,
  captureException,
  closeMainWindow,
  environment,
  getPreferenceValues,
  getSelectedFinderItems,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

type CommandSource = "selection" | "clipboard";
type Orientation = "horizontal" | "vertical";

interface RunCutOutOptions {
  source: CommandSource;
}

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface HelperSuccessResponse {
  status: "success";
  outputPath?: string;
  inputPath?: string;
  orientation: Orientation;
  removedPixels: number;
}

interface HelperCancelledResponse {
  status: "cancelled";
}

type HelperResponse = HelperSuccessResponse | HelperCancelledResponse;

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".tif",
  ".tiff",
  ".bmp",
  ".heic",
  ".heif",
  ".webp",
]);

export async function runCutOutCommand(options: RunCutOutOptions) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing Cut Out",
    message: "Building native editor",
  });

  try {
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });

    const helperPaths = getHelperPaths();
    await ensureHelperBuild(helperPaths.packagePath, helperPaths.buildPath, helperPaths.binaryPath);

    if (options.source === "selection") {
      const selectedImagePath = await getSelectedFinderImagePath();
      if (!selectedImagePath) {
        throw new Error("Select an image in Finder before running this command.");
      }

      const preferences = getPreferenceValues<Preferences>();
      const overwrite = preferences.exportMode === "overwrite";
      const revealInFinder = toBoolean(preferences.revealInFinder, true);
      const openAfterExport = toBoolean(preferences.openAfterExport, false);

      toast.message = "Launching editor window";
      const helperResponse = await runHelperBinary(helperPaths.binaryPath, {
        inputPath: selectedImagePath,
        overwrite,
      });

      if (helperResponse.status === "cancelled") {
        toast.style = Toast.Style.Success;
        toast.title = "Cut Out cancelled";
        toast.message = "No file was modified";
        return;
      }

      if (!helperResponse.outputPath) {
        throw new Error("The native editor did not return an output path.");
      }

      toast.style = Toast.Style.Success;
      toast.title = "Image updated";
      toast.message = path.basename(helperResponse.outputPath);

      if (revealInFinder) {
        await showInFinder(helperResponse.outputPath);
      }

      if (openAfterExport) {
        await open(helperResponse.outputPath);
      }

      return;
    }

    toast.message = "Reading image from clipboard";
    const helperResponse = await runHelperBinary(helperPaths.binaryPath, {
      inputClipboard: true,
      copyOutputToClipboard: true,
      overwrite: false,
    });

    if (helperResponse.status === "cancelled") {
      toast.style = Toast.Style.Success;
      toast.title = "Cut Out cancelled";
      toast.message = "Clipboard image was not modified";
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Image copied to clipboard";
    toast.message = "Use Cmd+V to paste the updated image";
  } catch (error) {
    captureException(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Cut Out failed";
    toast.message = errorToMessage(error);
  }
}

function getHelperPaths() {
  const packagePath = path.join(environment.assetsPath, "cutout-helper");
  const buildPath = path.join(environment.supportPath, "cutout-helper-build");
  const binaryPath = path.join(buildPath, "release", "CutOutHelper");
  return { packagePath, buildPath, binaryPath };
}

async function ensureHelperBuild(packagePath: string, buildPath: string, binaryPath: string): Promise<void> {
  const packageExists = await exists(packagePath);
  if (!packageExists) {
    throw new Error(`Swift helper package was not found at ${packagePath}`);
  }

  await mkdir(buildPath, { recursive: true });
  const needsBuild = environment.isDevelopment || (await helperNeedsBuild(packagePath, binaryPath));
  if (!needsBuild) {
    return;
  }

  const buildResult = await runProcess("swift", [
    "build",
    "-c",
    "release",
    "--package-path",
    packagePath,
    "--build-path",
    buildPath,
  ]);

  if (buildResult.exitCode !== 0) {
    throw new Error(`swift build failed: ${buildResult.stderr.trim() || buildResult.stdout.trim() || "Unknown error"}`);
  }
}

async function helperNeedsBuild(packagePath: string, binaryPath: string): Promise<boolean> {
  if (!(await exists(binaryPath))) {
    return true;
  }

  const binaryStats = await stat(binaryPath);
  const newestSourceMtime = await newestHelperSourceMtime(packagePath);
  return newestSourceMtime > binaryStats.mtimeMs;
}

async function newestHelperSourceMtime(rootPath: string): Promise<number> {
  let newestMtime = 0;
  const entries = await readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      newestMtime = Math.max(newestMtime, await newestHelperSourceMtime(fullPath));
      continue;
    }

    if (entry.name === "Package.swift" || entry.name.endsWith(".swift")) {
      const fileStats = await stat(fullPath);
      newestMtime = Math.max(newestMtime, fileStats.mtimeMs);
    }
  }

  return newestMtime;
}

async function runHelperBinary(
  binaryPath: string,
  options: { inputPath?: string; inputClipboard?: boolean; copyOutputToClipboard?: boolean; overwrite: boolean },
): Promise<HelperResponse> {
  const args: string[] = [];

  if (options.inputPath) {
    args.push("--input", options.inputPath);
  }
  if (options.inputClipboard) {
    args.push("--input-clipboard");
  }
  if (options.copyOutputToClipboard) {
    args.push("--copy-output-to-clipboard");
  }
  if (options.overwrite) {
    args.push("--overwrite");
  }

  const result = await runProcess(binaryPath, args);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "The native editor failed");
  }

  const payloadLine = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!payloadLine) {
    throw new Error("The native editor returned no data");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadLine);
  } catch {
    throw new Error(`Invalid native editor response: ${payloadLine}`);
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "status" in parsed &&
    (parsed.status === "cancelled" || parsed.status === "success")
  ) {
    return parsed as HelperResponse;
  }

  throw new Error("Unexpected native editor response");
}

async function runProcess(command: string, args: string[]): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });
  });
}

async function getSelectedFinderImagePath(): Promise<string | undefined> {
  try {
    const selectedItems = await getSelectedFinderItems();
    return selectedItems.map((item) => item.path).find((candidatePath) => isSupportedImage(candidatePath));
  } catch {
    return undefined;
  }
}

function isSupportedImage(filePath: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function toBoolean(value: boolean | string | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return fallback;
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

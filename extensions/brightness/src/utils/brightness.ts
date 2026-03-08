import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const HELPER_NAME = "brightness-helper";

type HelperSuccess = {
  status: "ok";
  brightness: number;
  displayID: string;
};

async function ensureHelper() {
  const binaryPath = path.join(environment.assetsPath, HELPER_NAME);
  try {
    await stat(binaryPath);
    return binaryPath;
  } catch {
    throw new Error("Native helper is missing. Run `npm run build` or `npm run dev`, then try again.");
  }
}

function parseHelperOutput(stdout: string): HelperSuccess {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("The native brightness helper returned an invalid response.");
  }

  if (!parsed || typeof parsed !== "object" || !("status" in parsed)) {
    throw new Error("The native brightness helper returned an invalid response.");
  }

  if (parsed.status === "error") {
    if (!("message" in parsed) || typeof parsed.message !== "string") {
      throw new Error("The native brightness helper returned an invalid response.");
    }

    throw new Error(parsed.message);
  }

  if (
    !("brightness" in parsed) ||
    typeof parsed.brightness !== "number" ||
    !Number.isFinite(parsed.brightness) ||
    !("displayID" in parsed) ||
    typeof parsed.displayID !== "string"
  ) {
    throw new Error("The native brightness helper returned an invalid response.");
  }

  return parsed as HelperSuccess;
}

export async function setBrightnessToPercent(percent: number) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("Brightness percent must be a number between 0 and 100.");
  }

  const binaryPath = await ensureHelper();
  let stdout: string;

  try {
    ({ stdout } = await execFileAsync(binaryPath, ["set", String(percent)]));
  } catch (error) {
    if (error instanceof Error && "stdout" in error && typeof error.stdout === "string" && error.stdout.trim()) {
      return parseHelperOutput(error.stdout);
    }

    const message = error instanceof Error && "stderr" in error ? String(error.stderr).trim() : "";
    throw new Error(message || "Open System Settings > Displays, then try again.");
  }

  return parseHelperOutput(stdout);
}

export async function stepBrightness(direction: "up" | "down") {
  const binaryPath = await ensureHelper();
  let stdout: string;

  try {
    ({ stdout } = await execFileAsync(binaryPath, ["step", direction]));
  } catch (error) {
    if (error instanceof Error && "stdout" in error && typeof error.stdout === "string" && error.stdout.trim()) {
      return parseHelperOutput(error.stdout);
    }

    const message = error instanceof Error && "stderr" in error ? String(error.stderr).trim() : "";
    throw new Error(message || "Open System Settings > Displays, then try again.");
  }

  return parseHelperOutput(stdout);
}

import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  assertOperation,
  CompletionState,
  Operation,
  parseResponse,
} from "./response";

const run = promisify(execFile);
let compiling: Promise<string> | undefined;
let statusReading: Promise<CompletionState> | undefined;

async function compileHelper(): Promise<string> {
  const source = path.join(environment.assetsPath, "cotypist-control.swift");
  const locator = path.join(environment.assetsPath, "control-locator.swift");
  const policy = path.join(environment.assetsPath, "snapshot-policy.swift");
  const hash = createHash("sha256")
    .update(await readFile(source))
    .update(await readFile(locator))
    .update(await readFile(policy))
    .digest("hex")
    .slice(0, 20);
  const binary = path.join(environment.supportPath, `cotypist-control-${hash}`);
  try {
    await access(binary);
    return binary;
  } catch {
    /* Build from the shipped source if it is not cached. */
  }
  await mkdir(environment.supportPath, { recursive: true, mode: 0o700 });
  const temporary = `${binary}-${process.pid}.tmp`;
  try {
    await run(
      "/usr/bin/swiftc",
      ["-parse-as-library", locator, policy, source, "-O", "-o", temporary],
      {
        timeout: 60_000,
        maxBuffer: 256_000,
      },
    );
    await chmod(temporary, 0o700);
    await rename(temporary, binary);
  } catch {
    await rm(temporary, { force: true });
    throw new Error(
      "Cotypist's native helper could not be built. Install Apple's Command Line Tools, then try again. The extension does not install tools or grant permissions automatically.",
    );
  }
  return binary;
}

async function executeControl(operation: Operation): Promise<CompletionState> {
  if (
    !["status", "enable-default", "disable-default", "toggle-default"].includes(
      operation,
    )
  )
    throw new Error("Unsupported Cotypist operation.");
  compiling ??= compileHelper().catch((error) => {
    compiling = undefined;
    throw error;
  });
  const binary = await compiling;
  let output: string;
  try {
    output = (
      await run(binary, [operation], { timeout: 35_000, maxBuffer: 64_000 })
    ).stdout;
  } catch (error) {
    const result = error as { stdout?: string; killed?: boolean };
    if (result.stdout?.trim()) {
      parseResponse(result.stdout);
      throw new Error(
        "Cotypist's native process exited unsuccessfully after its response. Check the setting before retrying.",
      );
    }
    throw new Error(
      result.killed
        ? "Cotypist's native controls did not respond in time. Check its setup and Accessibility permission before retrying."
        : "Cotypist's native controls could not run. Check its setup and Accessibility permission before retrying.",
    );
  }
  return assertOperation(operation, parseResponse(output));
}

export async function control(operation: Operation): Promise<CompletionState> {
  if (operation !== "status") return executeControl(operation);
  // React can start the read-only mount effect more than once. Share only a
  // currently pending status read in this command process; mutations and
  // separate Raycast commands still use the native operation lock.
  statusReading ??= executeControl(operation).finally(() => {
    statusReading = undefined;
  });
  return statusReading;
}

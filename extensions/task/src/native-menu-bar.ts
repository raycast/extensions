import { environment } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { type TaskSession } from "./timer";

const execute = promisify(execFile);

async function helperPath(): Promise<string> {
  const source = path.join(environment.assetsPath, "task-menubar.swift");
  const digest = createHash("sha256")
    .update(await readFile(source))
    .digest("hex")
    .slice(0, 16);
  const bundled = path.join(environment.assetsPath, `task-menubar-${digest}-${process.arch}`);
  try {
    await access(bundled);
    return bundled;
  } catch {
    // A different CPU architecture can compile the same bundled source locally.
  }
  const binary = path.join(environment.supportPath, `task-menubar-${digest}`);
  await mkdir(environment.supportPath, { recursive: true });
  try {
    await access(binary);
  } catch {
    const temporary = `${binary}.${process.pid}.tmp`;
    try {
      await execute(
        "/usr/bin/xcrun",
        [
          "swiftc",
          source,
          "-O",
          "-target",
          `${process.arch === "arm64" ? "arm64" : "x86_64"}-apple-macosx14.0`,
          "-module-cache-path",
          path.join(environment.supportPath, "swift-module-cache"),
          "-o",
          temporary,
        ],
        { timeout: 120_000 },
      );
      await rename(temporary, binary);
    } catch (error) {
      throw new Error(
        `Could not prepare the menu-bar helper. Check Xcode Command Line Tools. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return binary;
}

export async function startMenuBar(session: TaskSession): Promise<void> {
  const binary = await helperPath();
  const statePath = path.join(environment.supportPath, "menu-bar-session.json");
  const temporary = `${statePath}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(session), { mode: 0o600 });
  await rename(temporary, statePath);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, [statePath], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let settled = false;
    let output = "";
    let errors = "";
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error("Menu-bar helper startup timed out."));
    }, 10_000);
    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        resolve();
      }
    }
    child.once("error", finish);
    child.once("exit", (code) => {
      if (!settled) finish(new Error(errors || `Menu-bar helper exited before startup (${code}).`));
    });
    child.stderr.on("data", (data: Buffer) => {
      errors = (errors + data.toString()).slice(-4000);
    });
    child.stdout.on("data", (data: Buffer) => {
      output += data.toString();
      if (output.includes("TASK_MENU_BAR_READY")) finish();
    });
  });
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LearnCommandResult } from "./capture.js";
import {
  parseWorkspaceResources,
  type LearnResource,
  type WorkspaceResources,
} from "./resources.js";

const execFileAsync = promisify(execFile);

// Raycast launches extensions with a minimal PATH (/usr/bin:/bin:...), so neither a
// globally installed `learn` nor the `node` its `#!/usr/bin/env node` shebang needs
// would be found without the common Homebrew/user install locations.
const EXTRA_PATH_ENTRIES = ["/opt/homebrew/bin", "/usr/local/bin"];

function learnEnv(): NodeJS.ProcessEnv {
  const entries = (process.env.PATH || "").split(":").filter(Boolean);
  for (const entry of EXTRA_PATH_ENTRIES) {
    if (!entries.includes(entry)) entries.push(entry);
  }
  return { ...process.env, PATH: entries.join(":") };
}

export async function runLearn(
  args: string[],
  executable = "learn",
): Promise<LearnCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(executable, args, {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      env: learnEnv(),
    });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const result = error as {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      message?: string;
    };
    const exited = typeof result.code === "number";
    return {
      stdout: result.stdout || "",
      // Spawn failures (e.g. ENOENT when `learn` is not found) have no stderr and a
      // string code; keep the error message so callers can surface an actionable reason.
      stderr: result.stderr || (exited ? "" : result.message || ""),
      code: exited ? (result.code as number) : 1,
    };
  }
}

export async function checkedLearn(
  args: string[],
  executable = "learn",
): Promise<void> {
  const result = await runLearn(args, executable);
  if (result.code !== 0)
    throw new Error(result.stderr || result.stdout || "Learn command failed");
}

export async function listLearnResources(
  workspace: string,
  executable = "learn",
): Promise<WorkspaceResources> {
  const result = await runLearn([workspace, "ls", "--json"], executable);
  if (result.code !== 0)
    throw new Error(
      result.stderr || result.stdout || "Unable to list resources",
    );
  try {
    return parseWorkspaceResources(result.stdout, workspace);
  } catch {
    throw new Error("Learn returned an invalid resource list");
  }
}

export async function addLearnResource(
  workspace: string,
  source: string,
  title: string,
  tags: string[],
  executable = "learn",
): Promise<void> {
  await checkedLearn(
    [
      "add",
      "--workspace",
      workspace,
      ...(title ? ["--title", title] : []),
      ...(tags.length ? ["--tags", tags.join(",")] : []),
      "--",
      source,
    ],
    executable,
  );
}

export async function updateLearnTags(
  workspace: string,
  resource: LearnResource,
  tags: string[],
  executable = "learn",
): Promise<void> {
  const current = (
    await listLearnResources(workspace, executable)
  ).resources.find((item) => item.source === resource.source);
  if (!current) throw new Error("Resource no longer exists. Reload resources.");
  const operations = [
    ...current.tags
      .filter((tag) => !tags.includes(tag))
      .map((tag) => `-${tag}`),
    ...tags
      .filter((tag) => !current.tags.includes(tag))
      .map((tag) => `+${tag}`),
  ];
  if (!operations.length) return;
  // Published 0.1.0 reads raw tag args and treats `--` as a request to
  // remove the tag "-". Use legacy-compatible operands for ordinary tags;
  // literal option-like removals need the updated CLI's separator support.
  const needsSeparator = operations.some(
    (operation) => operation === "-w" || operation === "--workspace",
  );
  if (needsSeparator) {
    const help = await runLearn(["tag", "--help"], executable);
    if (
      help.code !== 0 ||
      !help.stdout.includes("literal resource/tag operands")
    ) {
      throw new Error(
        "Removing tags named w or -workspace requires an updated Learn CLI. Build it from the latest Learn source checkout.",
      );
    }
  }
  await checkedLearn(
    [
      "tag",
      "--workspace",
      workspace,
      ...(needsSeparator ? ["--"] : []),
      resource.source,
      ...operations,
    ],
    executable,
  );
  const updated = (
    await listLearnResources(workspace, executable)
  ).resources.find((item) => item.source === resource.source);
  if (
    !updated ||
    updated.tags.length !== tags.length ||
    !tags.every((tag) => updated.tags.includes(tag))
  ) {
    throw new Error(
      "Tags did not match the requested change. Update your Learn CLI and reload resources.",
    );
  }
}

export async function removeLearnResource(
  workspace: string,
  source: string,
  purge: boolean,
  executable = "learn",
): Promise<void> {
  await checkedLearn(
    [
      "rm",
      "--workspace",
      workspace,
      ...(purge ? ["--purge"] : []),
      "--",
      source,
    ],
    executable,
  );
}

export async function createLearnWorkspace(
  name: string,
  executable = "learn",
): Promise<void> {
  const result = await runLearn(["new", "--", name], executable);
  if (result.code !== 0) {
    throw new Error(
      result.stderr || result.stdout || "Unable to create Learn workspace",
    );
  }
}

export async function listLearnWorkspaces(
  executable = "learn",
): Promise<string[]> {
  const result = await runLearn(["list", "--json"], executable);
  if (result.code !== 0) {
    throw new Error(result.stderr || "Unable to list Learn workspaces");
  }

  try {
    const workspaces: unknown = JSON.parse(result.stdout);
    if (
      !Array.isArray(workspaces) ||
      !workspaces.every((item) => typeof item === "string")
    ) {
      throw new Error("invalid workspace list");
    }
    return workspaces;
  } catch {
    throw new Error("Learn returned an invalid workspace list");
  }
}

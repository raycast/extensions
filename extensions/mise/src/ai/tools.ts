import { runMise } from "../mise/exec";
import { listInstalled } from "../mise/installed";
import type { MiseLocation } from "../mise/locate";
import { addGlobally, failureMessage, runTask, upgrade, type MiseOperation } from "../mise/operations";
import { listOutdated, type OutdatedTool } from "../mise/outdated";
import { listTasks, type Task } from "../mise/tasks";
import { miseCommandLine } from "../terminal/script";
import { outdatedOptions, readPreferences, upgradeOptions } from "../ui/preferences";
import { resolveMiseFromRaycast } from "../ui/useMise";

// The AI tools run mise the way the commands do: the same binary (Mise Path or detection), the
// login-shell environment, the home directory as cwd, and only the global config.

export async function requireMise(): Promise<MiseLocation> {
  const mise = await resolveMiseFromRaycast();
  if (!("path" in mise)) {
    throw new Error(
      `mise was not found (searched ${mise.searched.join(", ")}). Set Mise Path in the extension's preferences.`,
    );
  }
  return mise;
}

// A tool is a registry short name (node), or backend:name with an optional @scope and /path
// (npm:@biomejs/biome, github:cli/cli, go:golang.org/x/tools/gopls). This rejects flags, spaces
// and `tool[option=value]`, whose options such as postinstall are commands.
const TOOL = /^[A-Za-z0-9][\w.+-]*(?::@?[\w.+-]+(?:\/[\w.+-]+)*)?$/;
// Versions: 20, 3.12.1, lts, latest, prefix:1.2, ref:abc123, sub-1:lts.
const VERSION = /^[A-Za-z0-9][\w.+:-]*$/;

export function checkTool(tool: string): string {
  const trimmed = tool.trim();
  if (!TOOL.test(trimmed))
    throw new Error(`"${tool}" is not a tool name mise accepts here, such as node or npm:prettier.`);
  return trimmed;
}

export function checkVersion(version: string | undefined): string {
  const trimmed = version?.trim() || "latest";
  if (!VERSION.test(trimmed))
    throw new Error(`"${version}" is not a version mise accepts here, such as 22, 3.12 or lts.`);
  return trimmed;
}

const OUTPUT_LIMIT = 6000;

// The end of a long run is where mise reports what failed, so a cut keeps the tail.
export function tail(text: string, limit = OUTPUT_LIMIT): string {
  const trimmed = text.trim();
  return trimmed.length <= limit ? trimmed : `…${trimmed.slice(trimmed.length - limit)}`;
}

export type OperationResult = { ok: boolean; command: string; exitCode: number | null; output: string; error?: string };

// A watch task or dev server never exits on its own; the chat waits on the tool until it does.
export const RUN_TIMEOUT_MS = 10 * 60 * 1000;

export async function runForAI(
  location: MiseLocation,
  op: MiseOperation,
  timeoutMs = RUN_TIMEOUT_MS,
): Promise<OperationResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  const result = await runMise(location, op.args, { signal });
  if (signal.aborted) {
    return {
      ok: false,
      command: displayCommand(op),
      exitCode: result.code,
      output: tail(
        [result.stdout, result.stderr]
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n"),
      ),
      error: `Stopped after ${timeoutMs / 60000} minutes without finishing. Run it from Manage Tasks in a terminal instead.`,
    };
  }
  const ok = result.code === 0;
  return {
    ok,
    command: displayCommand(op),
    exitCode: result.code,
    output: tail(
      [result.stdout, result.stderr]
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n"),
    ),
    ...(ok ? {} : { error: failureMessage(result.stderr) || `mise exited with code ${result.code}` }),
  };
}

export async function installedTools(location: MiseLocation) {
  const tools = await listInstalled(location);
  return tools.map(({ name, versions }) => ({
    tool: name,
    versions: versions.map((v) => ({
      version: v.version,
      active: v.active,
      ...(v.requestedVersion ? { requested: v.requestedVersion } : {}),
      ...(v.source ? { requestedBy: v.source.path } : {}),
    })),
  }));
}

function describeOutdated(tool: OutdatedTool) {
  if ("malformed" in tool)
    return { tool: tool.name, note: "mise reported this tool in a form the extension can't read" };
  return { tool: tool.name, requested: tool.requested, current: tool.current ?? null, latest: tool.latest };
}

export async function outdatedTools(location: MiseLocation) {
  const { tools, unchecked } = await listOutdated(location, outdatedOptions(readPreferences(), location));
  return {
    outdated: tools.map(describeOutdated),
    couldNotCheck: unchecked.map(({ name, version }) => ({ tool: name, version })),
  };
}

export function describeTask(task: Task) {
  return {
    name: task.name,
    ...(task.description ? { description: task.description } : {}),
    ...(task.aliases.length ? { aliases: task.aliases } : {}),
    ...(task.tags ? { tags: task.tags } : {}),
    ...(task.file ? { file: task.file } : { run: task.run }),
    ...(task.depends ? { alsoRuns: task.depends } : {}),
    source: task.source,
  };
}

export async function findTask(location: MiseLocation, name: string): Promise<Task> {
  const wanted = name.trim();
  const tasks = await listTasks(location);
  const task = tasks.find((t) => t.name === wanted) ?? tasks.find((t) => t.aliases.includes(wanted));
  if (!task) {
    const names = tasks.map((t) => t.name).join(", ") || "none";
    throw new Error(`There is no global mise task named "${name}". Global tasks: ${names}.`);
  }
  return task;
}

export function taskCommand(task: Task): string {
  return task.file ?? task.run.join(" && ");
}

export async function runGlobalTask(location: MiseLocation, name: string): Promise<OperationResult> {
  const task = await findTask(location, name);
  return runForAI(location, runTask(task.name));
}

export function useToolOperation(tool: string, version: string | undefined): MiseOperation {
  return addGlobally(checkTool(tool), checkVersion(version), { jobs: readPreferences().jobs });
}

export function upgradeOperation(location: MiseLocation, tool: string | undefined): MiseOperation {
  const name = tool?.trim() ? checkTool(tool) : undefined;
  return upgrade(name, upgradeOptions(readPreferences(), location));
}

export function displayCommand(op: MiseOperation): string {
  return miseCommandLine({ path: "mise" }, op);
}

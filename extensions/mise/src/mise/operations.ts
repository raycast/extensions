export type MiseOperation = {
  args: string[];
  title: string;
  successTitle: string;
  failureTitle: string;
};

export type Progress = { kind: "progress"; message: string } | { kind: "summary"; message: string };

export type UseOptions = { configFile?: string; jobs?: number };
export type UpgradeOptions = { bump?: boolean; inactive?: boolean; jobs?: number; prune?: boolean };
export type UninstallOptions = { unuse?: { configFile: string; requested: string } };
export type PruneScope = "all" | "tools" | "configs";

function jobsFlag(jobs: number | undefined): string[] {
  return jobs === undefined ? [] : ["-j", String(jobs)];
}

export function addGlobally(tool: string, version = "latest", options: UseOptions = {}): MiseOperation {
  const spec = `${tool}@${version}`;
  const target = options.configFile ? ["--path", options.configFile] : ["-g"];
  return {
    args: ["use", ...target, ...jobsFlag(options.jobs), spec],
    title: `Adding ${tool}…`,
    successTitle: `${tool} added`,
    failureTitle: `Adding ${tool} failed`,
  };
}

export function upgrade(tool?: string, options: UpgradeOptions = {}): MiseOperation {
  const flags = [
    ...(options.bump ? ["--bump"] : []),
    ...(options.inactive ? ["--inactive"] : []),
    ...jobsFlag(options.jobs),
    ...(options.prune ? ["--prune"] : []),
  ];
  return {
    args: ["upgrade", ...flags, ...(tool ? [tool] : [])],
    title: tool ? `Upgrading ${tool}…` : "Upgrading all tools…",
    successTitle: tool ? `${tool} upgraded` : "All tools upgraded",
    failureTitle: tool ? `Upgrading ${tool} failed` : "Upgrading all tools failed",
  };
}

// `mise unuse` matches the request as written in the config (node@lts), not the version it resolved to.
export function uninstall(tool: string, version: string, options: UninstallOptions = {}): MiseOperation {
  const spec = `${tool}@${version}`;
  const { unuse } = options;
  return {
    args: unuse ? ["unuse", "--path", unuse.configFile, `${tool}@${unuse.requested}`] : ["uninstall", spec],
    title: `Uninstalling ${spec}…`,
    successTitle: unuse ? `${spec} uninstalled and removed from config` : `${spec} uninstalled`,
    failureTitle: `Uninstalling ${spec} failed`,
  };
}

const PRUNE: Record<PruneScope, { flags: string[]; what: string }> = {
  all: { flags: [], what: "unused versions" },
  tools: { flags: ["--tools"], what: "unused versions" },
  configs: { flags: ["--configs"], what: "stale config links" },
};

export function prune(scope: PruneScope = "all"): MiseOperation {
  const { flags, what } = PRUNE[scope];
  return {
    args: ["prune", ...flags],
    title: `Pruning ${what}…`,
    successTitle: `Pruned ${what}`,
    failureTitle: "Prune failed",
  };
}

export function clearCache(): MiseOperation {
  return {
    args: ["cache", "clear"],
    title: "Clearing cache…",
    successTitle: "Cache cleared",
    failureTitle: "Clearing cache failed",
  };
}

export function runTask(name: string): MiseOperation {
  return {
    args: ["run", name],
    title: `Running ${name}…`,
    successTitle: `${name} finished`,
    failureTitle: `${name} failed`,
  };
}

const HEADER = /^by @jdx \S+ (.+)$/;
const TOOL = /^✓ (\S+)\s+(\S+)/;
const SUMMARY = /^\S*\s*\d+\/\d+ · (.+)$/;

export function parseProgressLine(line: string): Progress | undefined {
  const body = line.startsWith("mise ") ? line.slice("mise ".length).trim() : undefined;
  if (!body) return undefined;
  const header = HEADER.exec(body);
  if (header) return { kind: "progress", message: header[1] };
  const tool = TOOL.exec(body);
  if (tool) return { kind: "progress", message: `✓ ${tool[1]} ${tool[2]}` };
  const summary = SUMMARY.exec(body);
  if (summary) return { kind: "summary", message: summary[1] };
  return undefined;
}

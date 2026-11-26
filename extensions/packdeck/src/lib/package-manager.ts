import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  AuditReport,
  AuditSeverity,
  DependencyKind,
  GlobalPackage,
  InstallDependencyType,
  LocalProject,
  OutdatedPackage,
  PackageManagerName,
  ScriptExecutionResult,
  SecurityFixInfo,
  SecurityVulnerability,
} from "../types";
import { SEVERITY_META } from "./constants";
import { execCommand, ExecResult } from "./env";
import { fetchAbbreviatedMeta, fetchBulkSecurityAdvisories } from "./registry";
import { classifyBump, cleanVersion, findWantedVersion, isOutdated } from "./semver";
import { recordHistory, recordRecentScript } from "./storage";

export interface BuiltCommand {
  bin: PackageManagerName;
  args: string[];
  display: string;
}

const VALID_NPM_PACKAGE_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;
const VALID_VERSION_SPEC = /^[a-zA-Z0-9._^~>=<*+\-|]+$/;

export function isValidPackageName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 214 || trimmed.startsWith("-")) return false;
  return VALID_NPM_PACKAGE_NAME.test(trimmed);
}

export function isValidVersionSpec(version: string): boolean {
  const trimmed = version.trim();
  if (!trimmed || trimmed.length > 64 || trimmed.startsWith("-")) return false;
  return VALID_VERSION_SPEC.test(trimmed);
}

export function formatCommandDisplay(bin: string, args: string[]): string {
  const escapedArgs = args.map((a) => (/\s/.test(a) ? `"${a}"` : a));
  return [bin, ...escapedArgs].join(" ");
}

export function buildInstallCommand(
  pm: PackageManagerName,
  packageSpec: string,
  options: {
    isGlobal?: boolean;
    depType?: InstallDependencyType;
    exact?: boolean;
  } = {},
): BuiltCommand {
  const { isGlobal = false, depType = "prod", exact = false } = options;
  let args: string[];

  if (isGlobal) {
    switch (pm) {
      case "npm":
        args = ["install", "-g", packageSpec];
        break;
      case "pnpm":
        args = ["add", "-g", packageSpec];
        break;
      case "yarn":
        args = ["global", "add", packageSpec];
        break;
      case "bun":
        args = ["add", "-g", packageSpec];
        break;
    }
  } else {
    switch (pm) {
      case "npm": {
        args = ["install"];
        if (depType === "dev") args.push("--save-dev");
        else if (depType === "optional") args.push("--save-optional");
        else if (depType === "peer") args.push("--save-peer");
        if (exact) args.push("--save-exact");
        args.push(packageSpec);
        break;
      }
      case "pnpm": {
        args = ["add"];
        if (depType === "dev") args.push("-D");
        else if (depType === "optional") args.push("-O");
        else if (depType === "peer") args.push("--save-peer");
        if (exact) args.push("-E");
        args.push(packageSpec);
        break;
      }
      case "yarn": {
        args = ["add"];
        if (depType === "dev") args.push("-D");
        else if (depType === "optional") args.push("-O");
        else if (depType === "peer") args.push("-P");
        if (exact) args.push("-E");
        args.push(packageSpec);
        break;
      }
      case "bun": {
        args = ["add"];
        if (depType === "dev") args.push("-d");
        else if (depType === "optional") args.push("--optional");
        else if (depType === "peer") args.push("--peer");
        if (exact) args.push("-E");
        args.push(packageSpec);
        break;
      }
    }
  }

  return { bin: pm, args, display: formatCommandDisplay(pm, args) };
}

export function buildUninstallCommand(
  pm: PackageManagerName,
  packageName: string,
  options: { isGlobal?: boolean } = {},
): BuiltCommand {
  const { isGlobal = false } = options;
  let args: string[];

  if (isGlobal) {
    switch (pm) {
      case "npm":
        args = ["uninstall", "-g", packageName];
        break;
      case "pnpm":
        args = ["remove", "-g", packageName];
        break;
      case "yarn":
        args = ["global", "remove", packageName];
        break;
      case "bun":
        args = ["remove", "-g", packageName];
        break;
    }
  } else {
    args = pm === "npm" ? ["uninstall", packageName] : ["remove", packageName];
  }

  return { bin: pm, args, display: formatCommandDisplay(pm, args) };
}

export function buildUpdateCommand(
  pm: PackageManagerName,
  packageSpecs: string[],
  options: { isGlobal?: boolean; latest?: boolean } = {},
): BuiltCommand {
  const { isGlobal = false, latest = false } = options;

  // When upgrading to latest (potentially crossing major semver), explicit install <pkg>@latest works consistently across all 4 PMs
  if (latest && packageSpecs.length > 0) {
    const specs = packageSpecs.map((p) =>
      p.includes("@") && !p.startsWith("@") ? p : p.endsWith("@latest") ? p : `${p}@latest`,
    );
    if (isGlobal) {
      switch (pm) {
        case "npm":
          return {
            bin: pm,
            args: ["install", "-g", ...specs],
            display: formatCommandDisplay(pm, ["install", "-g", ...specs]),
          };
        case "pnpm":
          return { bin: pm, args: ["add", "-g", ...specs], display: formatCommandDisplay(pm, ["add", "-g", ...specs]) };
        case "yarn":
          return {
            bin: pm,
            args: ["global", "add", ...specs],
            display: formatCommandDisplay(pm, ["global", "add", ...specs]),
          };
        case "bun":
          return { bin: pm, args: ["add", "-g", ...specs], display: formatCommandDisplay(pm, ["add", "-g", ...specs]) };
      }
    }
    const verb = pm === "npm" ? "install" : "add";
    const args = [verb, ...specs];
    return { bin: pm, args, display: formatCommandDisplay(pm, args) };
  }

  let args: string[];
  if (isGlobal) {
    switch (pm) {
      case "npm":
        args = ["update", "-g", ...packageSpecs];
        break;
      case "pnpm":
        args = ["update", "-g", ...packageSpecs];
        break;
      case "yarn":
        args = ["global", "upgrade", ...packageSpecs];
        break;
      case "bun":
        args = ["update", "-g", ...packageSpecs];
        break;
    }
  } else {
    switch (pm) {
      case "npm":
        args = ["update", ...packageSpecs];
        break;
      case "pnpm":
        args = ["update", ...packageSpecs];
        break;
      case "yarn":
        args = ["upgrade", ...packageSpecs];
        break;
      case "bun":
        args = ["update", ...packageSpecs];
        break;
    }
  }

  return { bin: pm, args, display: formatCommandDisplay(pm, args) };
}

export function buildReinstallCommand(pm: PackageManagerName): BuiltCommand {
  const args = ["install"];
  return { bin: pm, args, display: formatCommandDisplay(pm, args) };
}

export function buildRunScriptCommand(
  pm: PackageManagerName,
  scriptName: string,
  extraArgs: string[] = [],
): BuiltCommand {
  let args: string[];
  if (pm === "npm") {
    args = extraArgs.length > 0 ? ["run", scriptName, "--", ...extraArgs] : ["run", scriptName];
  } else {
    args = ["run", scriptName, ...extraArgs];
  }
  return { bin: pm, args, display: formatCommandDisplay(pm, args) };
}

export function buildAuditFixCommand(pm: PackageManagerName, force = false): BuiltCommand | null {
  if (pm === "npm") {
    const args = force ? ["audit", "fix", "--force"] : ["audit", "fix"];
    return { bin: pm, args, display: formatCommandDisplay(pm, args) };
  }
  if (pm === "pnpm") {
    const args = ["audit", "--fix"];
    return { bin: pm, args, display: formatCommandDisplay(pm, args) };
  }
  return null;
}

export interface OperationOutcome {
  success: boolean;
  command: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  errorMessage?: string;
}

function summarizeError(res: ExecResult): string {
  const raw = (res.stderr || res.stdout).trim();
  if (!raw) return `Exited with code ${res.exitCode}`;
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const errLine = lines.find((l) => /ERR!|error:|ENOENT|EACCES|404|not found/i.test(l)) ?? lines[lines.length - 1];
  return errLine.slice(0, 220);
}

export async function executeInstall(params: {
  pm: PackageManagerName;
  packageName: string;
  version?: string;
  projectPath?: string;
  projectName?: string;
  isGlobal?: boolean;
  depType?: InstallDependencyType;
  exact?: boolean;
  additionalPath?: string;
}): Promise<OperationOutcome> {
  if (!isValidPackageName(params.packageName)) {
    return {
      success: false,
      command: `${params.pm} install`,
      durationMs: 0,
      stdout: "",
      stderr: "",
      errorMessage: `Invalid package name "${params.packageName}".`,
    };
  }
  if (params.version && !isValidVersionSpec(params.version)) {
    return {
      success: false,
      command: `${params.pm} install`,
      durationMs: 0,
      stdout: "",
      stderr: "",
      errorMessage: `Invalid version specifier "${params.version}".`,
    };
  }

  const spec =
    params.version && params.version !== "latest" ? `${params.packageName}@${params.version}` : params.packageName;
  const cmd = buildInstallCommand(params.pm, spec, {
    isGlobal: params.isGlobal,
    depType: params.depType,
    exact: params.exact,
  });

  const res = await execCommand(cmd.bin, cmd.args, {
    cwd: params.isGlobal ? undefined : params.projectPath,
    additionalPath: params.additionalPath,
    timeoutMs: 180_000,
  });

  const success = res.exitCode === 0;
  const errorMessage = success ? undefined : summarizeError(res);

  await recordHistory({
    action: "install",
    packageName: params.packageName,
    version: params.version,
    projectPath: params.projectPath,
    projectName: params.projectName,
    isGlobal: Boolean(params.isGlobal),
    packageManager: params.pm,
    command: cmd.display,
    args: cmd.args,
    success,
    durationMs: res.durationMs,
    errorMessage,
  });

  return {
    success,
    command: cmd.display,
    durationMs: res.durationMs,
    stdout: res.stdout,
    stderr: res.stderr,
    errorMessage,
  };
}

export async function executeUninstall(params: {
  pm: PackageManagerName;
  packageName: string;
  projectPath?: string;
  projectName?: string;
  isGlobal?: boolean;
  additionalPath?: string;
}): Promise<OperationOutcome> {
  const cmd = buildUninstallCommand(params.pm, params.packageName, { isGlobal: params.isGlobal });
  const res = await execCommand(cmd.bin, cmd.args, {
    cwd: params.isGlobal ? undefined : params.projectPath,
    additionalPath: params.additionalPath,
    timeoutMs: 120_000,
  });

  const success = res.exitCode === 0;
  const errorMessage = success ? undefined : summarizeError(res);

  await recordHistory({
    action: "uninstall",
    packageName: params.packageName,
    projectPath: params.projectPath,
    projectName: params.projectName,
    isGlobal: Boolean(params.isGlobal),
    packageManager: params.pm,
    command: cmd.display,
    args: cmd.args,
    success,
    durationMs: res.durationMs,
    errorMessage,
  });

  return {
    success,
    command: cmd.display,
    durationMs: res.durationMs,
    stdout: res.stdout,
    stderr: res.stderr,
    errorMessage,
  };
}

export async function executeUpdate(params: {
  pm: PackageManagerName;
  packages: string[];
  projectPath?: string;
  projectName?: string;
  isGlobal?: boolean;
  latest?: boolean;
  additionalPath?: string;
}): Promise<OperationOutcome> {
  const cmd = buildUpdateCommand(params.pm, params.packages, {
    isGlobal: params.isGlobal,
    latest: params.latest,
  });

  const res = await execCommand(cmd.bin, cmd.args, {
    cwd: params.isGlobal ? undefined : params.projectPath,
    additionalPath: params.additionalPath,
    timeoutMs: 180_000,
  });

  const success = res.exitCode === 0;
  const errorMessage = success ? undefined : summarizeError(res);

  await recordHistory({
    action: "update",
    packageName: params.packages.length === 1 ? params.packages[0] : `${params.packages.length} packages`,
    projectPath: params.projectPath,
    projectName: params.projectName,
    isGlobal: Boolean(params.isGlobal),
    packageManager: params.pm,
    command: cmd.display,
    args: cmd.args,
    success,
    durationMs: res.durationMs,
    errorMessage,
  });

  return {
    success,
    command: cmd.display,
    durationMs: res.durationMs,
    stdout: res.stdout,
    stderr: res.stderr,
    errorMessage,
  };
}

export async function executeReinstall(params: {
  pm: PackageManagerName;
  packageName?: string;
  depType?: InstallDependencyType;
  projectPath?: string;
  projectName?: string;
  isGlobal?: boolean;
  additionalPath?: string;
}): Promise<OperationOutcome> {
  const cmd = params.packageName
    ? buildInstallCommand(params.pm, params.packageName, { isGlobal: params.isGlobal, depType: params.depType })
    : buildReinstallCommand(params.pm);

  const res = await execCommand(cmd.bin, cmd.args, {
    cwd: params.isGlobal ? undefined : params.projectPath,
    additionalPath: params.additionalPath,
    timeoutMs: 240_000,
  });

  const success = res.exitCode === 0;
  const errorMessage = success ? undefined : summarizeError(res);

  await recordHistory({
    action: "reinstall",
    packageName: params.packageName,
    projectPath: params.projectPath,
    projectName: params.projectName,
    isGlobal: Boolean(params.isGlobal),
    packageManager: params.pm,
    command: cmd.display,
    args: cmd.args,
    success,
    durationMs: res.durationMs,
    errorMessage,
  });

  return {
    success,
    command: cmd.display,
    durationMs: res.durationMs,
    stdout: res.stdout,
    stderr: res.stderr,
    errorMessage,
  };
}

export async function executeProjectScript(params: {
  project: LocalProject;
  scriptName: string;
  scriptCommand: string;
  extraArgs?: string[];
  additionalPath?: string;
  timeoutMs?: number;
}): Promise<ScriptExecutionResult> {
  const startedAt = Date.now();
  const cmd = buildRunScriptCommand(params.project.packageManager, params.scriptName, params.extraArgs);

  const res = await execCommand(cmd.bin, cmd.args, {
    cwd: params.project.path,
    additionalPath: params.additionalPath,
    timeoutMs: params.timeoutMs ?? 90_000,
  });

  await recordRecentScript(params.project.path, params.scriptName, params.project.packageManager);
  await recordHistory({
    action: "script",
    packageName: params.scriptName,
    projectPath: params.project.path,
    projectName: params.project.name,
    isGlobal: false,
    packageManager: params.project.packageManager,
    command: cmd.display,
    args: cmd.args,
    success: res.exitCode === 0,
    durationMs: res.durationMs,
    errorMessage: res.exitCode === 0 ? undefined : summarizeError(res),
  });

  return {
    scriptName: params.scriptName,
    command: params.scriptCommand,
    fullCommand: cmd.display,
    projectPath: params.project.path,
    projectName: params.project.name,
    packageManager: params.project.packageManager,
    exitCode: res.exitCode,
    stdout: res.stdout,
    stderr: res.stderr,
    durationMs: res.durationMs,
    startedAt,
    timedOut: res.timedOut,
  };
}

export async function executeAuditFix(params: {
  project: LocalProject;
  force?: boolean;
  additionalPath?: string;
}): Promise<OperationOutcome> {
  const cmd = buildAuditFixCommand(params.project.packageManager, params.force);
  if (!cmd) {
    return {
      success: false,
      command: `${params.project.packageManager} audit`,
      durationMs: 0,
      stdout: "",
      stderr: "",
      errorMessage: `${params.project.packageManager} does not support automatic audit fix. Update vulnerable packages individually.`,
    };
  }

  const res = await execCommand(cmd.bin, cmd.args, {
    cwd: params.project.path,
    additionalPath: params.additionalPath,
    timeoutMs: 180_000,
  });

  const success = res.exitCode === 0;
  const errorMessage = success ? undefined : summarizeError(res);

  await recordHistory({
    action: "audit-fix",
    projectPath: params.project.path,
    projectName: params.project.name,
    isGlobal: false,
    packageManager: params.project.packageManager,
    command: cmd.display,
    args: cmd.args,
    success,
    durationMs: res.durationMs,
    errorMessage,
  });

  return {
    success,
    command: cmd.display,
    durationMs: res.durationMs,
    stdout: res.stdout,
    stderr: res.stderr,
    errorMessage,
  };
}

// ============================================================================
// Outdated Detection (Native CLI JSON + Universal Registry Fallback)
// ============================================================================

export function parseNpmOutdatedJson(
  rawJson: string,
  depKindLookup: Map<string, DependencyKind>,
): OutdatedPackage[] | null {
  const trimmed = rawJson.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as Record<
      string,
      { current?: string; wanted?: string; latest?: string; type?: string; dependencyType?: string; homepage?: string }
    >;
    if (typeof parsed !== "object" || parsed === null || "error" in parsed) {
      return null;
    }

    const list: OutdatedPackage[] = [];
    for (const [name, info] of Object.entries(parsed)) {
      if (!info || typeof info !== "object" || !info.latest) continue;
      const current = info.current ?? info.wanted ?? "not installed";
      const wanted = info.wanted ?? info.latest;
      const latest = info.latest;
      const rawType = (info.type ?? info.dependencyType) as DependencyKind | undefined;
      const dependencyType: DependencyKind = depKindLookup.get(name) ?? rawType ?? "dependencies";

      list.push({
        name,
        current,
        wanted,
        latest,
        bump: current === "not installed" ? "unknown" : classifyBump(current, latest),
        dependencyType,
        homepage: info.homepage,
      });
    }
    return sortOutdated(list);
  } catch {
    return null;
  }
}

export function parseYarnOutdatedNdjson(
  rawOutput: string,
  depKindLookup: Map<string, DependencyKind>,
): OutdatedPackage[] | null {
  const lines = rawOutput.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as { type?: string; data?: { body?: string[][] } };
      if (obj.type === "table" && Array.isArray(obj.data?.body)) {
        const list: OutdatedPackage[] = [];
        for (const row of obj.data.body) {
          // Yarn v1 table columns: [Package, Current, Wanted, Latest, Package Type, URL]
          const [name, current, wanted, latest, pkgType, url] = row;
          if (!name || !latest) continue;
          const dependencyType = (depKindLookup.get(name) ?? pkgType ?? "dependencies") as DependencyKind;
          list.push({
            name,
            current: current || "not installed",
            wanted: wanted || latest,
            latest,
            bump: classifyBump(current || "0.0.0", latest),
            dependencyType,
            homepage: url,
          });
        }
        return sortOutdated(list);
      }
    } catch {
      // continue scanning lines
    }
  }
  return null;
}

function sortOutdated(items: OutdatedPackage[]): OutdatedPackage[] {
  const order = { major: 0, minor: 1, patch: 2, prerelease: 3, unknown: 4 };
  return [...items].sort((a, b) => {
    if (order[a.bump] !== order[b.bump]) return order[a.bump] - order[b.bump];
    return a.name.localeCompare(b.name);
  });
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function checkProjectOutdated(
  project: LocalProject,
  options: { registryUrl?: string; additionalPath?: string } = {},
): Promise<OutdatedPackage[]> {
  const depKindLookup = new Map<string, DependencyKind>(project.dependencies.map((d) => [d.name, d.kind]));

  // Try fast native CLI JSON for npm, pnpm, yarn v1 first (when node_modules exists)
  const hasNodeModules = fs.existsSync(path.join(project.path, "node_modules"));
  if (hasNodeModules) {
    if (project.packageManager === "npm") {
      const res = await execCommand("npm", ["outdated", "--json"], {
        cwd: project.path,
        additionalPath: options.additionalPath,
        timeoutMs: 30_000,
      });
      const parsed = parseNpmOutdatedJson(res.stdout, depKindLookup);
      if (parsed !== null) return parsed;
    } else if (project.packageManager === "pnpm") {
      const res = await execCommand("pnpm", ["outdated", "--format", "json"], {
        cwd: project.path,
        additionalPath: options.additionalPath,
        timeoutMs: 30_000,
      });
      const parsed = parseNpmOutdatedJson(res.stdout, depKindLookup);
      if (parsed !== null) return parsed;
    } else if (project.packageManager === "yarn") {
      const res = await execCommand("yarn", ["outdated", "--json"], {
        cwd: project.path,
        additionalPath: options.additionalPath,
        timeoutMs: 30_000,
      });
      const parsed = parseYarnOutdatedNdjson(res.stdout, depKindLookup);
      if (parsed !== null) return parsed;
    }
  }

  // Universal registry fallback (always used for Bun, Yarn Berry, or projects without node_modules)
  const checkableDeps = project.dependencies.filter(
    (d) =>
      !d.declaredRange.startsWith("workspace:") &&
      !d.declaredRange.startsWith("file:") &&
      !d.declaredRange.startsWith("link:") &&
      !d.declaredRange.startsWith("git") &&
      !d.declaredRange.startsWith("http"),
  );

  const outdated: OutdatedPackage[] = [];
  await runWithConcurrency(checkableDeps, 8, async (dep) => {
    const meta = await fetchAbbreviatedMeta(dep.name, options.registryUrl);
    if (!meta || !meta.latest) return;

    const current = dep.installedVersion ?? cleanVersion(dep.declaredRange);
    const wanted = findWantedVersion(dep.declaredRange, meta.versions, meta.latest);

    if (isOutdated(current, meta.latest) || isOutdated(current, wanted)) {
      outdated.push({
        name: dep.name,
        current,
        wanted,
        latest: meta.latest,
        bump: classifyBump(current, meta.latest),
        dependencyType: dep.kind,
      });
    }
  });

  return sortOutdated(outdated);
}

// ============================================================================
// Security Audits (npm / pnpm / yarn CLI JSON + npm Bulk Advisory Fallback)
// ============================================================================

function normalizeAuditSeverity(raw: string | undefined): AuditSeverity {
  const lower = (raw ?? "").toLowerCase();
  if (lower === "critical" || lower === "high" || lower === "moderate" || lower === "low" || lower === "info") {
    return lower;
  }
  return "moderate";
}

export function buildCountsFromVulnerabilities(vulns: SecurityVulnerability[]): Record<AuditSeverity, number> {
  const counts: Record<AuditSeverity, number> = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };
  for (const v of vulns) {
    counts[v.severity] += 1;
  }
  return counts;
}

export function sortVulnerabilities(vulns: SecurityVulnerability[]): SecurityVulnerability[] {
  return [...vulns].sort((a, b) => {
    const rankDiff = SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank;
    if (rankDiff !== 0) return rankDiff;
    return a.packageName.localeCompare(b.packageName);
  });
}

export function parseNpmAuditJson(rawJson: string): SecurityVulnerability[] | null {
  const trimmed = rawJson.trim();
  if (!trimmed) return null;

  try {
    const data = JSON.parse(trimmed) as {
      error?: unknown;
      vulnerabilities?: Record<
        string,
        {
          name: string;
          severity?: string;
          isDirect?: boolean;
          range?: string;
          fixAvailable?: boolean | SecurityFixInfo;
          via?: Array<
            | string
            | {
                source?: number;
                name?: string;
                title?: string;
                url?: string;
                severity?: string;
                range?: string;
                cwe?: string[];
              }
          >;
        }
      >;
      advisories?: Record<
        string,
        {
          id: number;
          module_name: string;
          title: string;
          severity: string;
          vulnerable_versions: string;
          patched_versions?: string;
          url?: string;
          cves?: string[];
        }
      >;
    };

    if (data.error) return null;

    // npm v7+ audit report v2 format
    if (data.vulnerabilities && typeof data.vulnerabilities === "object") {
      const results: SecurityVulnerability[] = [];
      for (const [pkgName, vuln] of Object.entries(data.vulnerabilities)) {
        const viaObjects = (vuln.via ?? []).filter((v): v is Exclude<typeof v, string> => typeof v === "object");
        const viaStrings = (vuln.via ?? []).filter((v): v is string => typeof v === "string");
        const primary = viaObjects[0];

        results.push({
          id: primary?.source ? String(primary.source) : `npm-${pkgName}`,
          packageName: vuln.name || pkgName,
          title:
            primary?.title ||
            (viaStrings.length > 0
              ? `Vulnerable dependency via ${viaStrings.join(", ")}`
              : `Vulnerability in ${pkgName}`),
          severity: normalizeAuditSeverity(primary?.severity ?? vuln.severity),
          vulnerableRange: primary?.range ?? vuln.range ?? "*",
          url: primary?.url,
          cves: primary?.cwe ?? [],
          fixAvailable: vuln.fixAvailable ?? false,
          via: viaObjects.length > 0 ? viaObjects.map((o) => o.name ?? pkgName) : viaStrings,
          isDirect: Boolean(vuln.isDirect),
        });
      }
      return sortVulnerabilities(results);
    }

    // Legacy npm v6 / pnpm advisories format
    if (data.advisories && typeof data.advisories === "object") {
      const results: SecurityVulnerability[] = Object.values(data.advisories).map((adv) => ({
        id: String(adv.id),
        packageName: adv.module_name,
        title: adv.title,
        severity: normalizeAuditSeverity(adv.severity),
        vulnerableRange: adv.vulnerable_versions || "*",
        patchedVersions: adv.patched_versions,
        url: adv.url,
        cves: adv.cves ?? [],
        fixAvailable: Boolean(adv.patched_versions && adv.patched_versions !== "<0.0.0"),
        via: [adv.module_name],
        isDirect: true,
      }));
      return sortVulnerabilities(results);
    }

    return [];
  } catch {
    return null;
  }
}

export function parseYarnAuditNdjson(rawOutput: string): SecurityVulnerability[] | null {
  const lines = rawOutput.split(/\r?\n/).filter(Boolean);
  const vulns: SecurityVulnerability[] = [];
  let sawValidJson = false;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as {
        type?: string;
        data?: {
          advisory?: {
            id: number;
            module_name: string;
            title: string;
            severity: string;
            vulnerable_versions: string;
            patched_versions?: string;
            url?: string;
            cves?: string[];
          };
        };
      };
      sawValidJson = true;
      if (obj.type === "auditAdvisory" && obj.data?.advisory) {
        const adv = obj.data.advisory;
        vulns.push({
          id: String(adv.id),
          packageName: adv.module_name,
          title: adv.title,
          severity: normalizeAuditSeverity(adv.severity),
          vulnerableRange: adv.vulnerable_versions || "*",
          patchedVersions: adv.patched_versions,
          url: adv.url,
          cves: adv.cves ?? [],
          fixAvailable: Boolean(adv.patched_versions && adv.patched_versions !== "<0.0.0"),
          via: [adv.module_name],
          isDirect: true,
        });
      }
    } catch {
      // ignore non-json lines
    }
  }

  return sawValidJson ? sortVulnerabilities(vulns) : null;
}

export async function runProjectSecurityAudit(
  project: LocalProject,
  options: { registryUrl?: string; additionalPath?: string } = {},
): Promise<AuditReport> {
  let vulnerabilities: SecurityVulnerability[] | null = null;
  let source: "cli" | "registry-advisory" = "cli";

  if (project.packageManager === "npm" && fs.existsSync(path.join(project.path, "package-lock.json"))) {
    const res = await execCommand("npm", ["audit", "--json"], {
      cwd: project.path,
      additionalPath: options.additionalPath,
      timeoutMs: 30_000,
    });
    vulnerabilities = parseNpmAuditJson(res.stdout);
  } else if (project.packageManager === "pnpm" && fs.existsSync(path.join(project.path, "pnpm-lock.yaml"))) {
    const res = await execCommand("pnpm", ["audit", "--json"], {
      cwd: project.path,
      additionalPath: options.additionalPath,
      timeoutMs: 30_000,
    });
    vulnerabilities = parseNpmAuditJson(res.stdout);
  } else if (project.packageManager === "yarn" && fs.existsSync(path.join(project.path, "yarn.lock"))) {
    const res = await execCommand("yarn", ["audit", "--json"], {
      cwd: project.path,
      additionalPath: options.additionalPath,
      timeoutMs: 30_000,
    });
    vulnerabilities = parseYarnAuditNdjson(res.stdout);
  }

  // Fallback to npm Bulk Security Advisories API (works for Bun, Yarn Berry, or lockfile-less projects!)
  if (vulnerabilities === null) {
    source = "registry-advisory";
    const payload: Record<string, string[]> = {};
    for (const dep of project.dependencies) {
      const version = dep.installedVersion ?? cleanVersion(dep.declaredRange);
      if (/^\d+\.\d+\.\d+/.test(version)) {
        payload[dep.name] = [version];
      }
    }
    try {
      vulnerabilities = sortVulnerabilities(await fetchBulkSecurityAdvisories(payload, options.registryUrl));
    } catch (error) {
      return {
        projectPath: project.path,
        packageManager: project.packageManager,
        timestamp: Date.now(),
        total: 0,
        counts: { critical: 0, high: 0, moderate: 0, low: 0, info: 0 },
        vulnerabilities: [],
        source,
        rawError: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const counts = buildCountsFromVulnerabilities(vulnerabilities);
  return {
    projectPath: project.path,
    packageManager: project.packageManager,
    timestamp: Date.now(),
    total: vulnerabilities.length,
    counts,
    vulnerabilities,
    source,
  };
}

// ============================================================================
// Global Packages Listing (npm, pnpm, Yarn, Bun)
// ============================================================================

export async function listGlobalPackages(
  pm: PackageManagerName,
  options: { additionalPath?: string; checkLatest?: boolean; registryUrl?: string } = {},
): Promise<GlobalPackage[]> {
  const packages: GlobalPackage[] = [];

  if (pm === "npm") {
    const res = await execCommand("npm", ["list", "-g", "--depth=0", "--json"], {
      additionalPath: options.additionalPath,
      timeoutMs: 20_000,
    });
    try {
      const parsed = JSON.parse(res.stdout || "{}") as {
        dependencies?: Record<string, { version?: string }>;
      };
      for (const [name, info] of Object.entries(parsed.dependencies ?? {})) {
        packages.push({
          name,
          version: info.version ?? "unknown",
          packageManager: "npm",
        });
      }
    } catch {
      // ignore parse failure
    }
  } else if (pm === "pnpm") {
    const res = await execCommand("pnpm", ["list", "-g", "--depth=0", "--json"], {
      additionalPath: options.additionalPath,
      timeoutMs: 20_000,
    });
    try {
      const parsed = JSON.parse(res.stdout || "[]") as Array<{
        dependencies?: Record<string, { version?: string }>;
      }>;
      const deps = Array.isArray(parsed) ? parsed[0]?.dependencies : undefined;
      for (const [name, info] of Object.entries(deps ?? {})) {
        packages.push({
          name,
          version: info.version ?? "unknown",
          packageManager: "pnpm",
        });
      }
    } catch {
      // ignore
    }
  } else if (pm === "yarn") {
    const dirRes = await execCommand("yarn", ["global", "dir"], {
      additionalPath: options.additionalPath,
      timeoutMs: 10_000,
    });
    const globalDir =
      dirRes.exitCode === 0 ? dirRes.stdout.trim() : path.join(os.homedir(), ".config", "yarn", "global");
    const pkgFile = path.join(globalDir, "package.json");
    if (fs.existsSync(pkgFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(pkgFile, "utf8")) as {
          dependencies?: Record<string, string>;
        };
        for (const [name, version] of Object.entries(parsed.dependencies ?? {})) {
          packages.push({
            name,
            version: cleanVersion(version),
            packageManager: "yarn",
          });
        }
      } catch {
        // ignore
      }
    }
  } else if (pm === "bun") {
    const bunGlobalPkg = path.join(os.homedir(), ".bun", "install", "global", "package.json");
    if (fs.existsSync(bunGlobalPkg)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(bunGlobalPkg, "utf8")) as {
          dependencies?: Record<string, string>;
        };
        for (const [name, version] of Object.entries(parsed.dependencies ?? {})) {
          packages.push({
            name,
            version: cleanVersion(version),
            packageManager: "bun",
          });
        }
      } catch {
        // ignore
      }
    }
  }

  packages.sort((a, b) => a.name.localeCompare(b.name));

  if (options.checkLatest && packages.length > 0) {
    await runWithConcurrency(packages, 8, async (pkg) => {
      const meta = await fetchAbbreviatedMeta(pkg.name, options.registryUrl);
      if (meta?.latest) {
        pkg.latestVersion = meta.latest;
        if (isOutdated(pkg.version, meta.latest)) {
          pkg.bump = classifyBump(pkg.version, meta.latest);
        }
      }
    });
  }

  return packages;
}

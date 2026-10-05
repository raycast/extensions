import { opendir, realpath } from "node:fs/promises";
import path from "node:path";

import { mapWithConcurrency } from "../lib/async";
import { resolveExecutable, runCommand } from "../lib/command";
import { directorySize, modifiedAt, pathExists } from "../lib/fs";
import { matchingPinSources, scanRuntimePins, type RuntimePins } from "../lib/runtime-pins";
import type { CleanupCandidate, CleanupProvider, ProtectedItem, ProviderId, ScanContext, ScanResult } from "../types";
import { compareVersionNames } from "./ai-tools";

interface TrashCandidateInput {
  providerId: ProviderId;
  section: string;
  title: string;
  path: string;
  description: string;
  risk: "safe" | "review" | "high";
}

async function createTrashCandidate(
  input: TrashCandidateInput,
  signal?: AbortSignal,
): Promise<CleanupCandidate | undefined> {
  signal?.throwIfAborted();
  if (!(await pathExists(input.path))) return undefined;
  const bytes = await directorySize(input.path, signal);
  if (bytes === 0) return undefined;
  return {
    id: `${input.providerId}:runtime:${input.path}`,
    providerId: input.providerId,
    section: input.section,
    title: input.title,
    subtitle: input.path,
    description: input.description,
    cleanupPolicy: "trash",
    risk: input.risk,
    selectedByDefault: false,
    bytes,
    modifiedAt: await modifiedAt(input.path),
    path: input.path,
  };
}

interface RuntimeScanOutput {
  candidates: CleanupCandidate[];
  protectedItems: ProtectedItem[];
}

/**
 * Resolves the fnm default alias to its version directory name. The alias may point at the version directory itself
 * or at its `installation` child depending on the fnm release, so the name is taken relative to `node-versions`.
 */
export async function fnmDefaultVersion(homeDirectory: string): Promise<string | undefined> {
  const defaultAlias = path.join(homeDirectory, ".local/share/fnm/aliases/default");
  const versionsPath = path.join(homeDirectory, ".local/share/fnm/node-versions");
  if (!(await pathExists(defaultAlias)) || !(await pathExists(versionsPath))) return undefined;
  const versionsRoot = await realpath(versionsPath);
  const relative = path.relative(versionsRoot, await realpath(defaultAlias));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
  return relative.split(path.sep)[0];
}

interface FnmProtection {
  versions: { name: string; path: string }[];
  /** Protection reason keyed by version name; a version without an entry is removable. */
  reasons: Map<string, string>;
}

async function fnmProtection(context: ScanContext, pins: RuntimePins): Promise<FnmProtection> {
  const versionsRoot = path.join(context.homeDirectory, ".local/share/fnm/node-versions");
  if (!(await pathExists(versionsRoot))) return { versions: [], reasons: new Map() };
  const directory = await opendir(versionsRoot);
  const versions: { name: string; path: string }[] = [];
  for await (const entry of directory) {
    context.signal?.throwIfAborted();
    if (entry.isDirectory() && /^v\d/.test(entry.name)) {
      versions.push({ name: entry.name, path: path.join(versionsRoot, entry.name) });
    }
  }
  versions.sort((left, right) => compareVersionNames(right.name, left.name));

  const currentName = await fnmDefaultVersion(context.homeDirectory);
  const reasons = new Map<string, string>();
  if (currentName) reasons.set(currentName, "Default fnm version");
  const newest = versions[0];
  if (newest && newest.name !== currentName) reasons.set(newest.name, "Newest installed version");
  const currentIndex = versions.findIndex((version) => version.name === currentName);
  const rollback = currentIndex >= 0 ? versions[currentIndex + 1] : versions[0];
  if (rollback) reasons.set(rollback.name, "Newest rollback version");
  for (const version of versions) {
    const sources = matchingPinSources(pins.node, version.name);
    if (sources.length > 0) reasons.set(version.name, `Pinned by ${sources.join(", ")}`);
  }
  return { versions, reasons };
}

async function scanFnmVersions(context: ScanContext, pins: RuntimePins): Promise<RuntimeScanOutput> {
  const { versions, reasons: protectionReasons } = await fnmProtection(context, pins);
  const candidates = await mapWithConcurrency(
    versions.filter((version) => !protectionReasons.has(version.name)),
    3,
    (version) =>
      createTrashCandidate(
        {
          providerId: "node",
          section: "Runtime Versions",
          title: `Node.js ${version.name}`,
          path: version.path,
          description:
            "An older fnm-managed Node.js version. The default version and one rollback version are protected.",
          risk: "review",
        },
        context.signal,
      ),
    context.signal,
  );
  return {
    candidates: candidates.filter((candidate): candidate is CleanupCandidate => candidate !== undefined),
    protectedItems: versions
      .filter((version) => protectionReasons.has(version.name))
      .map((version) => ({
        id: `node:protected:${version.name}`,
        providerId: "node",
        title: `Node.js ${version.name}`,
        reason: protectionReasons.get(version.name) ?? "Protected runtime",
        path: version.path,
      })),
  };
}

interface RustProtection {
  executable: string;
  toolchains: string[];
  /** Protection reason keyed by toolchain name; a toolchain without an entry is removable. */
  reasons: Map<string, string>;
}

async function rustProtection(context: ScanContext, pins: RuntimePins): Promise<RustProtection | undefined> {
  const executable = await resolveExecutable("rustup", context);
  if (!executable) return undefined;
  const [activeResult, listResult, overrideResult] = await Promise.all([
    runCommand(
      { executable, args: ["show", "active-toolchain"], timeoutMs: 10_000 },
      context.signal,
      context.extraPath,
    ),
    runCommand({ executable, args: ["toolchain", "list"], timeoutMs: 10_000 }, context.signal, context.extraPath),
    runCommand({ executable, args: ["override", "list"], timeoutMs: 10_000 }, context.signal, context.extraPath).catch(
      () => ({ stdout: "", stderr: "" }),
    ),
  ]);
  const active = activeResult.stdout.trim().split(/\s+/)[0];
  const listedToolchains = listResult.stdout
    .split("\n")
    .map((line) => ({ name: line.trim().split(/\s+/)[0], line }))
    .filter(({ name }) => Boolean(name));
  const reasons = new Map<string, string>();
  if (active) reasons.set(active, "Active toolchain in the current context");
  for (const toolchain of listedToolchains) {
    if (toolchain.line.includes("default")) reasons.set(toolchain.name, "Default rustup toolchain");
  }
  for (const line of overrideResult.stdout.split("\n")) {
    const match = /^(.*?)\s+(\S+)$/.exec(line.trim());
    if (match) reasons.set(match[2], `Used by rustup override at ${match[1]}`);
  }
  for (const toolchain of listedToolchains) {
    const sources = matchingPinSources(pins.rust, toolchain.name);
    if (sources.length > 0) reasons.set(toolchain.name, `Pinned by ${sources.join(", ")}`);
  }
  return { executable, toolchains: listedToolchains.map(({ name }) => name), reasons };
}

async function scanRustToolchains(context: ScanContext, pins: RuntimePins): Promise<RuntimeScanOutput> {
  const protection = await rustProtection(context, pins);
  if (!protection) return { candidates: [], protectedItems: [] };
  const { executable, toolchains, reasons } = protection;
  const removable = toolchains.filter((name) => !reasons.has(name));

  return {
    candidates: await Promise.all(
      removable.map(async (toolchain): Promise<CleanupCandidate> => {
        const toolchainPath = path.join(context.homeDirectory, ".rustup/toolchains", toolchain);
        return {
          id: `rustup:toolchain:${toolchain}`,
          providerId: "rustup",
          section: "Runtime Versions",
          title: `Rust ${toolchain}`,
          subtitle: `${executable} toolchain uninstall ${toolchain}`,
          description: "A non-current Rust toolchain with no detected project pin or rustup override.",
          cleanupPolicy: "command",
          risk: "review",
          selectedByDefault: false,
          bytes: (await pathExists(toolchainPath)) ? await directorySize(toolchainPath, context.signal) : undefined,
          path: (await pathExists(toolchainPath)) ? toolchainPath : undefined,
          command: { executable, args: ["toolchain", "uninstall", toolchain], timeoutMs: 300_000 },
        };
      }),
    ),
    protectedItems: toolchains
      .filter((name) => reasons.has(name))
      .map((name) => ({
        id: `rustup:protected:${name}`,
        providerId: "rustup",
        title: `Rust ${name}`,
        reason: reasons.get(name) ?? "Protected runtime",
        path: path.join(context.homeDirectory, ".rustup/toolchains", name),
      })),
  };
}

/**
 * Re-evaluates runtime protection for a Node.js or Rust candidate at cleanup time, since the default version, active
 * toolchain, overrides, or project pins may have changed after the scan. Returns the reason when it is now protected.
 */
export async function runtimeProtectionReason(
  candidate: CleanupCandidate,
  context: ScanContext,
  pins: RuntimePins,
): Promise<string | undefined> {
  if (candidate.providerId === "node" && candidate.path) {
    const { reasons } = await fnmProtection(context, pins);
    return reasons.get(path.basename(candidate.path));
  }
  if (candidate.providerId === "rustup") {
    const toolchain = candidate.id.replace(/^rustup:toolchain:/, "");
    const protection = await rustProtection(context, pins);
    if (!protection) return "rustup is no longer available";
    return protection.reasons.get(toolchain);
  }
  return undefined;
}

async function scanRegenerableCaches(context: ScanContext): Promise<CleanupCandidate[]> {
  const home = context.homeDirectory;
  const inputs: TrashCandidateInput[] = [
    {
      providerId: "cargo",
      section: "Build and Package Caches",
      title: "Cargo registry cache",
      path: path.join(home, ".cargo/registry"),
      description: "Downloaded crates and unpacked sources. Cargo will download them again when needed.",
      risk: "review",
    },
    {
      providerId: "cargo",
      section: "Build and Package Caches",
      title: "Cargo Git cache",
      path: path.join(home, ".cargo/git"),
      description: "Git dependencies cached by Cargo. Cargo will clone them again when needed.",
      risk: "review",
    },
    {
      providerId: "gradle",
      section: "Build and Package Caches",
      title: "Gradle caches",
      path: path.join(home, ".gradle/caches"),
      description: "Regenerable Gradle dependency and build caches. Close Gradle builds and IDEs before cleanup.",
      risk: "high",
    },
    {
      providerId: "gradle",
      section: "Build and Package Caches",
      title: "Gradle wrapper distributions",
      path: path.join(home, ".gradle/wrapper/dists"),
      description: "Downloaded Gradle distributions. Project wrappers will download required versions again.",
      risk: "review",
    },
    {
      providerId: "android",
      section: "Build and Package Caches",
      title: "Android user cache",
      path: path.join(home, ".android/cache"),
      description: "Regenerable Android tooling cache. AVD definitions and SDK packages are not included.",
      risk: "review",
    },
    {
      providerId: "android",
      section: "Build and Package Caches",
      title: "Android SDK temporary downloads",
      path: path.join(home, "Library/Android/sdk/.temp"),
      description:
        "Incomplete or temporary Android SDK downloads. Installed SDK packages and system images are protected.",
      risk: "safe",
    },
  ];
  const candidates = await mapWithConcurrency(
    inputs,
    3,
    (input) => createTrashCandidate(input, context.signal),
    context.signal,
  );
  return candidates.filter((candidate): candidate is CleanupCandidate => candidate !== undefined);
}

export class RuntimeCachesProvider implements CleanupProvider {
  readonly id = "node" as const;

  async scan(context: ScanContext): Promise<ScanResult> {
    const pins = await scanRuntimePins(context.projectRoots, context.signal);
    const sources: { providerId: ProviderId; scan: () => Promise<RuntimeScanOutput> }[] = [
      { providerId: "node", scan: () => scanFnmVersions(context, pins) },
      { providerId: "rustup", scan: () => scanRustToolchains(context, pins) },
      {
        providerId: "cargo",
        scan: async () => ({ candidates: await scanRegenerableCaches(context), protectedItems: [] }),
      },
    ];
    const results = await Promise.allSettled(sources.map((source) => source.scan()));
    context.signal?.throwIfAborted();
    return {
      candidates: results.flatMap((result) => (result.status === "fulfilled" ? result.value.candidates : [])),
      protectedItems: results.flatMap((result) => (result.status === "fulfilled" ? result.value.protectedItems : [])),
      issues: results.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ providerId: sources[index].providerId, message: (result.reason as Error).message }]
          : [],
      ),
    };
  }
}

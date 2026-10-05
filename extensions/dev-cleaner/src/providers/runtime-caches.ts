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

async function scanFnmVersions(context: ScanContext, pins: RuntimePins): Promise<RuntimeScanOutput> {
  const versionsRoot = path.join(context.homeDirectory, ".local/share/fnm/node-versions");
  if (!(await pathExists(versionsRoot))) return { candidates: [], protectedItems: [] };
  const directory = await opendir(versionsRoot);
  const versions: { name: string; path: string }[] = [];
  for await (const entry of directory) {
    context.signal?.throwIfAborted();
    if (entry.isDirectory() && /^v\d/.test(entry.name)) {
      versions.push({ name: entry.name, path: path.join(versionsRoot, entry.name) });
    }
  }
  versions.sort((left, right) => compareVersionNames(right.name, left.name));

  let currentName: string | undefined;
  const defaultAlias = path.join(context.homeDirectory, ".local/share/fnm/aliases/default");
  if (await pathExists(defaultAlias)) {
    const target = await realpath(defaultAlias);
    currentName = path.basename(path.dirname(target));
  }
  const protectedNames = new Set<string>();
  const protectionReasons = new Map<string, string>();
  if (currentName) protectedNames.add(currentName);
  if (currentName) protectionReasons.set(currentName, "Default fnm version");
  const newest = versions[0];
  if (newest) {
    protectedNames.add(newest.name);
    if (newest.name !== currentName) protectionReasons.set(newest.name, "Newest installed version");
  }
  const currentIndex = versions.findIndex((version) => version.name === currentName);
  const rollback = currentIndex >= 0 ? versions[currentIndex + 1] : versions[0];
  if (rollback) {
    protectedNames.add(rollback.name);
    protectionReasons.set(rollback.name, "Newest rollback version");
  }
  for (const version of versions) {
    const sources = matchingPinSources(pins.node, version.name);
    if (sources.length === 0) continue;
    protectedNames.add(version.name);
    protectionReasons.set(version.name, `Pinned by ${sources.join(", ")}`);
  }

  const candidates = await mapWithConcurrency(
    versions.filter((version) => !protectedNames.has(version.name)),
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
      .filter((version) => protectedNames.has(version.name))
      .map((version) => ({
        id: `node:protected:${version.name}`,
        providerId: "node",
        title: `Node.js ${version.name}`,
        reason: protectionReasons.get(version.name) ?? "Protected runtime",
        path: version.path,
      })),
  };
}

async function scanRustToolchains(context: ScanContext, pins: RuntimePins): Promise<RuntimeScanOutput> {
  const executable = await resolveExecutable("rustup", context);
  if (!executable) return { candidates: [], protectedItems: [] };
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
  const removable = listedToolchains.filter(({ name }) => !reasons.has(name));

  return {
    candidates: await Promise.all(
      removable.map(async ({ name: toolchain }): Promise<CleanupCandidate> => {
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
    protectedItems: listedToolchains
      .filter(({ name }) => reasons.has(name))
      .map(({ name }) => ({
        id: `rustup:protected:${name}`,
        providerId: "rustup",
        title: `Rust ${name}`,
        reason: reasons.get(name) ?? "Protected runtime",
        path: path.join(context.homeDirectory, ".rustup/toolchains", name),
      })),
  };
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

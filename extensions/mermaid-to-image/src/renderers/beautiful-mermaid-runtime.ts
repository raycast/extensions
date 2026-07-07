import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { pathToFileURL } from "url";
import {
  BUNDLED_BEAUTIFUL_MERMAID_VERSION,
  getBundledBeautifulMermaidVersionFallback,
} from "./beautiful-mermaid-metadata";

const execFilePromise = promisify(execFile);

export interface BeautifulMermaidModule {
  THEMES: Record<string, BeautifulMermaidThemeColors>;
  renderMermaidSVG: (code: string, options?: Record<string, unknown>) => string;
  renderMermaidASCII: (
    code: string,
    options?: {
      useAscii?: boolean;
      colorMode?: "none" | "auto" | "ansi16" | "ansi256" | "truecolor" | "html";
    },
  ) => string;
}

interface BeautifulMermaidThemeColors {
  bg: string;
  fg: string;
  line?: string;
  accent?: string;
  muted?: string;
  surface?: string;
  border?: string;
}

export type BeautifulMermaidSourceKind = "custom" | "global" | "bundled";

export interface BeautifulMermaidRuntime {
  module: BeautifulMermaidModule;
  sourceKind: BeautifulMermaidSourceKind;
  version: string;
  resolvedPath: string;
  usedBundledFallback: boolean;
}

export interface ResolveBeautifulMermaidRuntimeOptions {
  customPath?: string;
  globalPackageRoots?: string[];
  bundledModuleLoader?: () => Promise<BeautifulMermaidModule>;
  bundledMetadata?: {
    version: string;
    resolvedPath: string;
  };
  notifyBundledFallback?: boolean;
}

interface PackageResolution {
  packageRoot: string;
  entryPath: string;
  version: string;
}

const runtimeCache = new Map<string, Promise<BeautifulMermaidRuntime>>();
let bundledFallbackNoticeShown = false;

function expandHomePath(inputPath: string): string {
  return inputPath.startsWith("~/") ? path.join(os.homedir(), inputPath.slice(2)) : inputPath;
}

function normalizeVersion(rawVersion: string | undefined): string {
  if (!rawVersion) return "unknown";
  const normalized = rawVersion.trim().replace(/^[^\d]*/, "");
  return normalized.length > 0 ? normalized : rawVersion.trim();
}

function findNearestPackageJsonPath(startPath: string): string | null {
  let currentPath = path.dirname(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    const packageJsonPath = path.join(currentPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

function readPackageResolution(packageRoot: string): PackageResolution | null {
  const packageJsonPath = path.join(packageRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
    version?: string;
    exports?: Record<string, { import?: string }>;
    main?: string;
  };

  const entryRelativePath = packageJson.exports?.["."]?.import ?? packageJson.main ?? "dist/index.js";
  const entryPath = path.resolve(packageRoot, entryRelativePath);

  if (!fs.existsSync(entryPath)) {
    return null;
  }

  return {
    packageRoot,
    entryPath,
    version: normalizeVersion(packageJson.version),
  };
}

function resolveCustomPackage(inputPath: string | undefined): PackageResolution | null {
  if (!inputPath?.trim()) {
    return null;
  }

  const expandedPath = path.resolve(expandHomePath(inputPath.trim()));
  if (!fs.existsSync(expandedPath)) {
    return null;
  }

  const stat = fs.statSync(expandedPath);
  if (stat.isDirectory()) {
    return readPackageResolution(expandedPath);
  }

  if (!stat.isFile()) {
    return null;
  }

  const packageJsonPath =
    path.basename(expandedPath) === "package.json" ? expandedPath : findNearestPackageJsonPath(expandedPath);
  const version = packageJsonPath
    ? normalizeVersion(JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")).version as string | undefined)
    : "unknown";

  return {
    packageRoot: packageJsonPath ? path.dirname(packageJsonPath) : path.dirname(expandedPath),
    entryPath: expandedPath,
    version,
  };
}

async function loadModuleFromEntry(entryPath: string): Promise<BeautifulMermaidModule> {
  const specifier = pathToFileURL(entryPath).href;

  try {
    return (await import(specifier)) as BeautifulMermaidModule;
  } catch (primaryError) {
    try {
      const dynamicImport = new Function("resolvedSpecifier", "return import(resolvedSpecifier)") as (
        resolvedSpecifier: string,
      ) => Promise<BeautifulMermaidModule>;
      return await dynamicImport(specifier);
    } catch {
      throw primaryError;
    }
  }
}

async function resolveNpmRoot(): Promise<string | null> {
  try {
    const { stdout } = await execFilePromise("npm", ["root", "-g"]);
    const npmRoot = stdout.trim();
    return npmRoot.length > 0 ? npmRoot : null;
  } catch {
    return null;
  }
}

async function defaultGlobalPackageRoots(): Promise<string[]> {
  const roots = new Set<string>();
  const npmRoot = await resolveNpmRoot();
  if (npmRoot) {
    roots.add(npmRoot);
  }

  [
    "/opt/homebrew/lib/node_modules",
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
    path.join(os.homedir(), ".npm-global", "lib", "node_modules"),
  ].forEach((candidate) => {
    if (fs.existsSync(candidate)) {
      roots.add(candidate);
    }
  });

  const nvmVersionsPath = path.join(os.homedir(), ".nvm", "versions", "node");
  if (fs.existsSync(nvmVersionsPath)) {
    for (const versionName of fs.readdirSync(nvmVersionsPath)) {
      const candidate = path.join(nvmVersionsPath, versionName, "lib", "node_modules");
      if (fs.existsSync(candidate)) {
        roots.add(candidate);
      }
    }
  }

  return [...roots];
}

async function resolveGlobalPackage(globalPackageRoots: string[]): Promise<PackageResolution | null> {
  for (const packageRoot of globalPackageRoots) {
    const candidate = readPackageResolution(path.join(packageRoot, "beautiful-mermaid"));
    if (candidate) {
      return candidate;
    }
  }
  return null;
}

async function loadBundledModule(): Promise<BeautifulMermaidModule> {
  try {
    return (await import("beautiful-mermaid")) as BeautifulMermaidModule;
  } catch (primaryError) {
    try {
      const dynamicImport = new Function("specifier", "return import(specifier)") as (
        specifier: string,
      ) => Promise<BeautifulMermaidModule>;
      return await dynamicImport("beautiful-mermaid");
    } catch {
      throw primaryError;
    }
  }
}

function defaultBundledMetadata(): { version: string; resolvedPath: string } {
  return getBundledBeautifulMermaidMetadata();
}

function resolveBundledModulePath(): string | null {
  try {
    const dynamicRequire = new Function(
      "return typeof require !== 'undefined' ? require : null",
    )() as NodeJS.Require | null;

    if (dynamicRequire) {
      return dynamicRequire.resolve("beautiful-mermaid");
    }
  } catch {
    // Ignore and fall through to cwd-based fallback.
  }

  return null;
}

export function getBundledBeautifulMermaidMetadata(): { version: string; resolvedPath: string } {
  const resolvedModulePath = resolveBundledModulePath();
  if (resolvedModulePath) {
    const packageJsonPath = findNearestPackageJsonPath(resolvedModulePath);
    if (packageJsonPath && fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as { version?: string };
      return {
        version: normalizeVersion(packageJson.version),
        resolvedPath: packageJsonPath,
      };
    }
  }

  const extensionPackageJsonPath = path.join(process.cwd(), "package.json");
  if (fs.existsSync(extensionPackageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(extensionPackageJsonPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    return {
      version: normalizeVersion(packageJson.dependencies?.["beautiful-mermaid"]),
      resolvedPath: "bundled:beautiful-mermaid",
    };
  }

  return {
    version: BUNDLED_BEAUTIFUL_MERMAID_VERSION,
    resolvedPath: "bundled:beautiful-mermaid",
  };
}

async function notifyBundledFallbackOnce(version: string): Promise<void> {
  if (bundledFallbackNoticeShown) {
    return;
  }

  bundledFallbackNoticeShown = true;
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<typeof import("@raycast/api")>;
    const raycastApi = await dynamicImport("@raycast/api");
    await raycastApi.showToast({
      style: raycastApi.Toast.Style.Success,
      title: "Using bundled beautiful-mermaid",
      message: `v${version} loaded. Install globally or set a custom path to override.`,
    });
  } catch {
    // Tests and non-Raycast environments should ignore toast delivery failures.
  }
}

export function formatBeautifulMermaidSourceLabel(
  runtime: Pick<BeautifulMermaidRuntime, "sourceKind" | "version">,
): string {
  const version =
    runtime.sourceKind === "bundled" ? getBundledBeautifulMermaidVersionFallback(runtime.version) : runtime.version;

  return `${runtime.sourceKind} v${version}`;
}

export function resetBeautifulMermaidRuntimeCache() {
  runtimeCache.clear();
  bundledFallbackNoticeShown = false;
}

export async function resolveBeautifulMermaidRuntime(
  options: ResolveBeautifulMermaidRuntimeOptions = {},
): Promise<BeautifulMermaidRuntime> {
  const cacheKey = JSON.stringify({
    customPath: options.customPath ?? "",
    globalPackageRoots: options.globalPackageRoots ?? [],
  });

  const cached = runtimeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const runtimePromise = (async () => {
    const customPackage = resolveCustomPackage(options.customPath);
    if (customPackage) {
      return {
        module: await loadModuleFromEntry(customPackage.entryPath),
        sourceKind: "custom" as const,
        version: customPackage.version,
        resolvedPath: customPackage.entryPath,
        usedBundledFallback: false,
      };
    }

    const globalPackageRoots = options.globalPackageRoots ?? (await defaultGlobalPackageRoots());
    const globalPackage = await resolveGlobalPackage(globalPackageRoots);
    if (globalPackage) {
      return {
        module: await loadModuleFromEntry(globalPackage.entryPath),
        sourceKind: "global" as const,
        version: globalPackage.version,
        resolvedPath: globalPackage.entryPath,
        usedBundledFallback: false,
      };
    }

    const bundledMetadata = options.bundledMetadata ?? defaultBundledMetadata();
    const bundledRuntime: BeautifulMermaidRuntime = {
      module: options.bundledModuleLoader ? await options.bundledModuleLoader() : await loadBundledModule(),
      sourceKind: "bundled",
      version: getBundledBeautifulMermaidVersionFallback(normalizeVersion(bundledMetadata.version)),
      resolvedPath: bundledMetadata.resolvedPath,
      usedBundledFallback: true,
    };

    if (options.notifyBundledFallback && bundledRuntime.usedBundledFallback) {
      await notifyBundledFallbackOnce(bundledRuntime.version);
    }

    return bundledRuntime;
  })();

  runtimeCache.set(cacheKey, runtimePromise);
  return runtimePromise;
}

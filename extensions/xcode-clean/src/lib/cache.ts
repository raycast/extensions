import { homedir } from "os";
import { join } from "path";
import { promises as fs } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type CacheCategory = "Xcode" | "Kotlin / Gradle";

export type CacheEntry = {
  id: string;
  name: string;
  description: string;
  /** Long-form English explanation shown in the info Detail view. */
  info: string;
  category: CacheCategory;
  paths: string[];
};

const HOME = homedir();

export const CACHES = {
  derivedData: {
    id: "derivedData",
    name: "Derived Data",
    description: "Build artifacts and indexes for all Xcode projects.",
    info: "Xcode stores compiled build artifacts, swift module indexes, and intermediate products in **Derived Data**. Every project gets its own subfolder. Removing it forces Xcode to rebuild from scratch on the next build. The first build after cleaning is slower, but it resolves most stale-cache and linker issues.",
    category: "Xcode",
    paths: [join(HOME, "Library/Developer/Xcode/DerivedData")],
  },
  spm: {
    id: "spm",
    name: "Swift Package Manager",
    description: "SPM download cache.",
    info: "Swift Package Manager downloads remote packages into this shared cache so they can be reused across projects. After cleaning, packages will be re-fetched on the next resolve.",
    category: "Xcode",
    paths: [join(HOME, "Library/Caches/org.swift.swiftpm")],
  },
  moduleCache: {
    id: "moduleCache",
    name: "Module Cache",
    description: "Precompiled module cache (inside DerivedData).",
    info: "The precompiled **module cache** speeds up Swift module imports by caching the compiled form of system and SDK modules. It can become corrupt and cause confusing build errors (`module file ... was created by a different version of the compiler`). Cleaning it forces Xcode to recompile module headers on the next build.",
    category: "Xcode",
    paths: [
      join(HOME, "Library/Developer/Xcode/DerivedData/ModuleCache.noindex"),
    ],
  },
  xcodeCaches: {
    id: "xcodeCaches",
    name: "Xcode Caches",
    description: "Xcode application caches in ~/Library/Caches.",
    info: "Generic Xcode application caches. Includes UI state, telemetry buffers, and other app-level scratch data. Safe to delete. Xcode regenerates anything it needs.",
    category: "Xcode",
    paths: [join(HOME, "Library/Caches/com.apple.dt.Xcode")],
  },
  simulatorCaches: {
    id: "simulatorCaches",
    name: "Simulator Caches",
    description: "CoreSimulator caches (does NOT delete simulators).",
    info: "Cached metadata for the iOS Simulator (image catalogs, runtime caches). **Does not** delete simulators or their installed apps. Those live in `~/Library/Developer/CoreSimulator/Devices` and are not touched.",
    category: "Xcode",
    paths: [join(HOME, "Library/Developer/CoreSimulator/Caches")],
  },
  iosDeviceSupport: {
    id: "iosDeviceSupport",
    name: "iOS Device Support",
    description: "Symbol files for connected iOS devices.",
    info: "When you connect an iOS device, Xcode downloads symbol files matching that OS version so it can debug crashes and lldb sessions. These accumulate over years of devices and can grow to several GB. Symbols will be re-downloaded the next time you connect a device on that OS.",
    category: "Xcode",
    paths: [join(HOME, "Library/Developer/Xcode/iOS DeviceSupport")],
  },
  watchosDeviceSupport: {
    id: "watchosDeviceSupport",
    name: "watchOS Device Support",
    description: "Symbol files for connected watchOS devices.",
    info: "Symbol files Xcode downloaded to support debugging on connected Apple Watches. Re-downloaded on the next watch connection.",
    category: "Xcode",
    paths: [join(HOME, "Library/Developer/Xcode/watchOS DeviceSupport")],
  },
  tvosDeviceSupport: {
    id: "tvosDeviceSupport",
    name: "tvOS Device Support",
    description: "Symbol files for connected tvOS devices.",
    info: "Symbol files Xcode downloaded to support debugging on connected Apple TVs. Re-downloaded on the next tvOS device connection.",
    category: "Xcode",
    paths: [join(HOME, "Library/Developer/Xcode/tvOS DeviceSupport")],
  },
  macosDeviceSupport: {
    id: "macosDeviceSupport",
    name: "macOS Device Support",
    description: "Symbol files for macOS devices.",
    info: "Symbol files Xcode downloaded for macOS targets. Re-downloaded on the next macOS debugging session.",
    category: "Xcode",
    paths: [join(HOME, "Library/Developer/Xcode/macOS DeviceSupport")],
  },
  iosDeviceLogs: {
    id: "iosDeviceLogs",
    name: "iOS Device Logs",
    description: "Crash logs from connected devices.",
    info: "Crash reports and unified logs Xcode collected from connected iOS devices. Safe to delete. Xcode will pick up new ones the next time a device is connected.",
    category: "Xcode",
    paths: [join(HOME, "Library/Developer/Xcode/iOS Device Logs")],
  },
  konan: {
    id: "konan",
    name: "Kotlin/Native (.konan)",
    description: "Kotlin/Native compiler, dependencies, llvm. Often huge.",
    info: "`~/.konan` holds the Kotlin/Native compiler binary, an LLVM toolchain, and platform libraries downloaded for each Kotlin/Native target (iosArm64, iosX64, iosSimulatorArm64, etc.). It is often the single biggest cache on a KMP developer's machine, with 5 to 15 GB being normal.\n\nAfter cleaning, the next Kotlin/Native build will re-download every component you need. Expect several minutes on the first build.",
    category: "Kotlin / Gradle",
    paths: [join(HOME, ".konan")],
  },
  gradleGlobal: {
    id: "gradleGlobal",
    name: "Global Gradle Caches",
    description: "~/.gradle/caches. Slow to rebuild for every project.",
    info: "`~/.gradle/caches` contains every JAR, dependency, transformed artifact, and downloaded module Gradle has ever fetched, **across all your projects**.\n\nCleaning it is a heavy operation: every Gradle project on the machine will re-download dependencies on the next build. Use only when you really want a global reset. For a per-project clean, prefer the Deep Clean action on the Kotlin Multiplatform Project command.",
    category: "Kotlin / Gradle",
    paths: [join(HOME, ".gradle/caches")],
  },
} satisfies Record<string, CacheEntry>;

export type CacheKey = keyof typeof CACHES;

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function parseDuOutput(stdout: string): number {
  const kb = parseInt(stdout.trim().split(/\s+/)[0], 10);
  return Number.isFinite(kb) ? kb * 1024 : 0;
}

export async function getSize(path: string): Promise<number> {
  if (!(await pathExists(path))) return 0;
  try {
    const { stdout } = await execFileAsync("du", ["-sk", path]);
    return parseDuOutput(stdout);
  } catch (e) {
    // du exits non-zero when some entries are unreadable, but still prints
    // the total it could measure.
    const stdout = (e as { stdout?: string }).stdout ?? "";
    return parseDuOutput(stdout);
  }
}

export async function getCacheSize(cache: CacheEntry): Promise<number> {
  const sizes = await Promise.all(cache.paths.map(getSize));
  return sizes.reduce((a, b) => a + b, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function prettyPath(path: string): string {
  return path.startsWith(HOME) ? "~" + path.slice(HOME.length) : path;
}

export async function rmrf(path: string): Promise<void> {
  if (!(await pathExists(path))) return;
  await execFileAsync("rm", ["-rf", path]);
}

export async function cleanCache(cache: CacheEntry): Promise<void> {
  await Promise.all(cache.paths.map(rmrf));
}

export async function cleanCaches(caches: CacheEntry[]): Promise<void> {
  await Promise.all(caches.map(cleanCache));
}

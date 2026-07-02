import type { ScanResult } from "../types";
import { expandHome, formatBytes, getSizeAsync, isDirPresent, isToolAvailableAsync } from "../utils/disk";

export async function scanPackageCaches(): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  // npm cache
  const npmPath = expandHome("~/.npm");
  if (isDirPresent(npmPath)) {
    const size = await getSizeAsync(npmPath);
    results.push({
      id: "npm-cache",
      title: "npm Cache",
      description: `Cached packages downloaded by npm (${formatBytes(size)}). Safe to clean — packages re-download on next install.`,
      category: "package-caches",
      path: npmPath,
      size,
      risk: "safe",
      available: await isToolAvailableAsync("npm"),
      cleanCommand: "npm cache clean --force",
      cleanAction: { type: "command", command: "npm", args: ["cache", "clean", "--force"] },
      requiresTool: "npm",
      icon: "box",
    });
  }

  // Yarn cache
  const yarnPath = expandHome("~/Library/Caches/Yarn");
  if (isDirPresent(yarnPath)) {
    const size = await getSizeAsync(yarnPath);
    results.push({
      id: "yarn-cache",
      title: "Yarn Cache",
      description: `Cached packages downloaded by Yarn (${formatBytes(size)}). Safe to clean — packages re-download on next install.`,
      category: "package-caches",
      path: yarnPath,
      size,
      risk: "safe",
      available: true,
      cleanCommand: "rm -rf ~/Library/Caches/Yarn",
      cleanAction: { type: "rmrf" },
      icon: "box",
    });
  }

  // pnpm store
  const pnpmPath = expandHome("~/Library/pnpm/store");
  if (isDirPresent(pnpmPath)) {
    const size = await getSizeAsync(pnpmPath);
    results.push({
      id: "pnpm-store",
      title: "pnpm Store",
      description: `pnpm content-addressable store (${formatBytes(size)}). Removes unreferenced packages only.`,
      category: "package-caches",
      path: pnpmPath,
      size,
      risk: "safe",
      available: await isToolAvailableAsync("pnpm"),
      cleanCommand: "pnpm store prune",
      cleanAction: { type: "command", command: "pnpm", args: ["store", "prune"] },
      requiresTool: "pnpm",
      icon: "box",
    });
  }

  // Homebrew cache
  const brewPath = expandHome("~/Library/Caches/Homebrew");
  if (isDirPresent(brewPath)) {
    const size = await getSizeAsync(brewPath);
    results.push({
      id: "homebrew-cache",
      title: "Homebrew Cache",
      description: `Downloaded bottles and source archives (${formatBytes(size)}). Safe to clean with 'brew cleanup'.`,
      category: "package-caches",
      path: brewPath,
      size,
      risk: "safe",
      available: await isToolAvailableAsync("brew"),
      cleanCommand: "brew cleanup --prune=0",
      cleanAction: { type: "command", command: "brew", args: ["cleanup", "--prune=0"] },
      requiresTool: "brew",
      icon: "box",
    });
  }

  // CocoaPods cache
  const podsPath = expandHome("~/Library/Caches/CocoaPods");
  if (isDirPresent(podsPath)) {
    const size = await getSizeAsync(podsPath);
    results.push({
      id: "cocoapods-cache",
      title: "CocoaPods Cache",
      description: `Cached pod specs and sources (${formatBytes(size)}). Safe to clean — pods re-download on next install.`,
      category: "package-caches",
      path: podsPath,
      size,
      risk: "safe",
      available: true,
      cleanCommand: "rm -rf ~/Library/Caches/CocoaPods",
      cleanAction: { type: "rmrf" },
      icon: "box",
    });
  }

  // pip cache
  const pipPath = expandHome("~/Library/Caches/pip");
  if (isDirPresent(pipPath)) {
    const size = await getSizeAsync(pipPath);
    results.push({
      id: "pip-cache",
      title: "pip Cache",
      description: `Cached Python packages (${formatBytes(size)}). Safe to clean — packages re-download on next install.`,
      category: "package-caches",
      path: pipPath,
      size,
      risk: "safe",
      available: await isToolAvailableAsync("pip3"),
      cleanCommand: "pip3 cache purge",
      cleanAction: { type: "command", command: "pip3", args: ["cache", "purge"] },
      requiresTool: "pip3",
      icon: "box",
    });
  }

  // Composer cache (PHP)
  const composerPath = expandHome("~/Library/Caches/composer");
  if (isDirPresent(composerPath)) {
    const size = await getSizeAsync(composerPath);
    results.push({
      id: "composer-cache",
      title: "Composer Cache",
      description: `Cached PHP packages (${formatBytes(size)}). Safe to clean — packages re-download on next install.`,
      category: "package-caches",
      path: composerPath,
      size,
      risk: "safe",
      available: true,
      cleanCommand: "rm -rf ~/Library/Caches/composer",
      cleanAction: { type: "rmrf" },
      icon: "box",
    });
  }

  return results;
}

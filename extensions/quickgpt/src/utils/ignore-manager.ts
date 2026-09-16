import ignore from "ignore";
import type { Ignore } from "ignore";
import fs from "fs";
import path from "path";
import DEFAULT_IGNORE_RULES from "./default-ignore-rules";

class IgnoreManager {
  private static instance: IgnoreManager;
  private ignoreCache: Map<string, Ignore> = new Map();
  private readonly defaultIgnoreRules = DEFAULT_IGNORE_RULES;

  private constructor() {}

  static getInstance(): IgnoreManager {
    if (!IgnoreManager.instance) {
      IgnoreManager.instance = new IgnoreManager();
    }
    return IgnoreManager.instance;
  }

  getIgnoreForDirectory(dirPath: string): Ignore {
    const cached = this.ignoreCache.get(dirPath);
    if (cached) {
      return cached;
    }

    const ig = ignore();
    ig.add(this.defaultIgnoreRules);

    const ignoreFiles = this.findIgnoreFiles(dirPath);
    for (const ignorePath of ignoreFiles) {
      try {
        const content = fs.readFileSync(ignorePath, "utf-8");
        ig.add(content);
      } catch (error) {
        console.debug(`Failed to read ignore file at ${ignorePath}:`, error);
      }
    }

    this.ignoreCache.set(dirPath, ig);
    return ig;
  }

  private getIgnoreForFile(filePath: string, basePath: string): Ignore {
    const fileDir = path.dirname(filePath);
    const cacheKey = `${basePath}:${fileDir}`;

    const cached = this.ignoreCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const ig = ignore();
    ig.add(this.defaultIgnoreRules);

    const ignoreFiles = this.findIgnoreFilesForPath(basePath, fileDir);
    for (const ignorePath of ignoreFiles) {
      try {
        const content = fs.readFileSync(ignorePath, "utf-8");
        ig.add(content);
      } catch (error) {
        console.debug(`Failed to read ignore file at ${ignorePath}:`, error);
      }
    }

    this.ignoreCache.set(cacheKey, ig);
    return ig;
  }

  private findIgnoreFilesForPath(basePath: string, targetPath: string): string[] {
    const ignoreFiles: string[] = [];
    const dirsToCheck = this.getDirectoriesInPath(basePath, targetPath);

    for (const dir of dirsToCheck) {
      const quickgptIgnorePath = path.join(dir, ".quickgptignore");
      if (fs.existsSync(quickgptIgnorePath)) {
        ignoreFiles.push(quickgptIgnorePath);
      }

      const gitignorePath = path.join(dir, ".gitignore");
      if (fs.existsSync(gitignorePath)) {
        ignoreFiles.push(gitignorePath);
      }
    }

    return ignoreFiles;
  }

  private getDirectoriesInPath(basePath: string, targetPath: string): string[] {
    let currentDir = path.resolve(targetPath);
    const resolvedBasePath = path.resolve(basePath);

    const dirsToCheck: string[] = [];
    while (currentDir && currentDir.startsWith(resolvedBasePath)) {
      dirsToCheck.unshift(currentDir);
      if (currentDir === resolvedBasePath) {
        break;
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    return dirsToCheck;
  }

  private findIgnoreFiles(dirPath: string): string[] {
    const ignoreFiles: string[] = [];
    let currentDir = dirPath;

    const dirsToCheck: string[] = [];
    while (currentDir && currentDir !== path.dirname(currentDir)) {
      dirsToCheck.unshift(currentDir);
      currentDir = path.dirname(currentDir);
    }

    for (const dir of dirsToCheck) {
      const quickgptIgnorePath = path.join(dir, ".quickgptignore");
      if (fs.existsSync(quickgptIgnorePath)) {
        ignoreFiles.push(quickgptIgnorePath);
      }

      const gitignorePath = path.join(dir, ".gitignore");
      if (fs.existsSync(gitignorePath)) {
        ignoreFiles.push(gitignorePath);
      }
    }

    return ignoreFiles;
  }

  shouldIgnore(filePath: string, basePath: string, isDirectory: boolean): boolean {
    const ig = this.getIgnoreForFile(filePath, basePath);
    const relativePath = path.relative(basePath, filePath);
    const normalizedPath = relativePath.replace(/\\/g, "/");

    if (isDirectory) {
      return ig.ignores(normalizedPath) || ig.ignores(normalizedPath + "/");
    }

    return ig.ignores(normalizedPath);
  }

  isBinaryFile(filePath: string): boolean {
    const fileName = path.basename(filePath);

    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex <= 0) {
      if (lastDotIndex === -1 || fileName.substring(lastDotIndex + 1) === "") {
        return true;
      }
    }

    const ig = ignore();
    ig.add(this.getBinaryFilePatterns());
    return ig.ignores(fileName);
  }

  private getBinaryFilePatterns(): string {
    const lines = this.defaultIgnoreRules.split("\n");
    const binarySection: string[] = [];
    let inBinarySection = false;

    for (const line of lines) {
      if (line.includes("# Binary and media files")) {
        inBinarySection = true;
        continue;
      }
      if (inBinarySection && line.startsWith("#") && !line.includes("Binary")) {
        break;
      }
      if (inBinarySection && line.trim()) {
        binarySection.push(line);
      }
    }

    return binarySection.join("\n");
  }

  clearCache(): void {
    this.ignoreCache.clear();
  }
}

export default IgnoreManager.getInstance();

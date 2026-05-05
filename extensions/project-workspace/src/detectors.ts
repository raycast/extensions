import type { Dirent } from "fs";
import fs from "fs/promises";
import path from "path";

import { GitRemote } from "./types";

const MARKER_FILES = new Set([
  "package.json",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "Pipfile",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  "CMakeLists.txt",
  "Makefile",
  "Package.swift",
  "turbo.json",
  "nx.json",
]);

const FRAMEWORK_PACKAGES: Record<string, string> = {
  next: "Next.js",
  nuxt: "Nuxt",
  astro: "Astro",
  vite: "Vite",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
  "@nestjs/core": "NestJS",
  electron: "Electron",
  expo: "Expo",
  "@angular/core": "Angular",
};

const EXTENSION_LANGUAGES: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".swift": "Swift",
  ".m": "Objective-C",
  ".mm": "Objective-C++",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".cc": "C++",
  ".cxx": "C++",
  ".hpp": "C++",
  ".py": "Python",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".dart": "Dart",
};

export const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  "dist",
  "build",
  "target",
  ".gradle",
  "coverage",
  ".cache",
  ".venv",
  "vendor",
  "DerivedData",
  "__pycache__",
]);

export interface DetectedFacts {
  packageName?: string;
  frameworks: string[];
  languages: string[];
  gitRemotes: GitRemote[];
  urlsFromPackageMetadata: string[];
}

export function isIgnoredDirectoryName(name: string): boolean {
  return IGNORED_DIRECTORY_NAMES.has(name) || name === ".DS_Store";
}

export function isProjectDirectory(entries: Dirent[]): boolean {
  const names = new Set(entries.map((entry) => entry.name));

  if (entries.some((entry) => MARKER_FILES.has(entry.name))) {
    return true;
  }

  if (names.has(".git") || [...names].some((name) => name.endsWith(".xcodeproj") || name.endsWith(".xcworkspace"))) {
    return true;
  }

  if (names.has("AndroidManifest.xml")) {
    return true;
  }

  return entries.some((entry) => {
    if (!entry.isFile()) {
      return false;
    }

    const extension = path.extname(entry.name);
    return [".c", ".cpp", ".cc", ".rs", ".go", ".swift"].includes(extension);
  });
}

export function isDirectoryEmpty(entries: Dirent[]): boolean {
  return entries.filter((entry) => entry.name !== ".DS_Store").length === 0;
}

export async function detectProjectFacts(projectPath: string, entries: Dirent[]): Promise<DetectedFacts> {
  const frameworks = new Set<string>();
  const languages = new Set<string>();
  const urlsFromPackageMetadata = new Set<string>();
  const packageFacts = await detectPackageFacts(projectPath);

  if (packageFacts.packageName) {
    languages.add("JavaScript");
  }

  for (const framework of packageFacts.frameworks) {
    frameworks.add(framework);
  }

  for (const url of packageFacts.urlsFromPackageMetadata) {
    urlsFromPackageMetadata.add(url);
  }

  for (const entry of entries) {
    const entryName = entry.name;

    if (entryName === "Cargo.toml") languages.add("Rust");
    if (entryName === "go.mod") languages.add("Go");
    if (entryName === "pyproject.toml" || entryName === "requirements.txt" || entryName === "setup.py")
      languages.add("Python");
    if (entryName === "pom.xml") languages.add("Java");
    if (entryName === "build.gradle" || entryName === "build.gradle.kts") languages.add("Java");
    if (entryName === "Package.swift") languages.add("Swift");
    if (entryName === "CMakeLists.txt" || entryName === "Makefile") languages.add("C/C++");
    if (entryName === "next.config.js" || entryName === "next.config.mjs" || entryName === "next.config.ts")
      frameworks.add("Next.js");
    if (entryName.startsWith("nuxt.config.")) frameworks.add("Nuxt");
    if (entryName.startsWith("astro.config.")) frameworks.add("Astro");
    if (entryName.startsWith("vite.config.")) frameworks.add("Vite");
    if (entryName === "turbo.json") frameworks.add("Turborepo");
    if (entryName === "nx.json") frameworks.add("Nx");
    if (entryName.endsWith(".xcodeproj") || entryName.endsWith(".xcworkspace")) frameworks.add("Xcode");
    if (entryName === "AndroidManifest.xml") frameworks.add("Android");
  }

  const javaBuildText = await readJavaBuildText(projectPath);
  if (javaBuildText.includes("spring-boot") || javaBuildText.includes("org.springframework.boot")) {
    frameworks.add("Spring Boot");
  }

  if (javaBuildText.includes("com.android.application") || javaBuildText.includes("com.android.library")) {
    frameworks.add("Android");
    languages.add("Kotlin");
  }

  for (const language of await detectLanguagesFromExtensions(projectPath)) {
    languages.add(language);
  }

  return {
    packageName: packageFacts.packageName,
    frameworks: Array.from(frameworks).sort(),
    languages: Array.from(languages).sort(),
    gitRemotes: await detectGitRemotes(projectPath),
    urlsFromPackageMetadata: Array.from(urlsFromPackageMetadata).sort(),
  };
}

export function normalizeGitUrl(rawUrl: string): string {
  const withoutGitPrefix = rawUrl.trim().replace(/^git\+/, "");
  const scpLikeMatch = withoutGitPrefix.match(/^git@([^:]+):(.+?)(?:\.git)?$/);

  if (scpLikeMatch) {
    return `https://${scpLikeMatch[1]}/${scpLikeMatch[2].replace(/\.git$/, "")}`;
  }

  const sshMatch = withoutGitPrefix.match(/^ssh:\/\/git@([^/]+)\/(.+?)(?:\.git)?$/);

  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2].replace(/\.git$/, "")}`;
  }

  return withoutGitPrefix.replace(/\.git$/, "");
}

async function detectPackageFacts(projectPath: string): Promise<{
  packageName?: string;
  frameworks: string[];
  urlsFromPackageMetadata: string[];
}> {
  const packageJsonPath = path.join(projectPath, "package.json");

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8")) as {
      name?: string;
      homepage?: string;
      repository?: string | { url?: string };
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      workspaces?: unknown;
    };
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };
    const frameworks = new Set<string>();
    const urlsFromPackageMetadata = new Set<string>();

    for (const packageName of Object.keys(dependencies)) {
      const framework = FRAMEWORK_PACKAGES[packageName];

      if (framework) {
        frameworks.add(framework);
      }
    }

    if (packageJson.workspaces) {
      frameworks.add("Monorepo");
    }

    if (packageJson.homepage) {
      urlsFromPackageMetadata.add(packageJson.homepage);
    }

    if (typeof packageJson.repository === "string") {
      urlsFromPackageMetadata.add(normalizeGitUrl(packageJson.repository));
    } else if (packageJson.repository?.url) {
      urlsFromPackageMetadata.add(normalizeGitUrl(packageJson.repository.url));
    }

    return {
      packageName: packageJson.name,
      frameworks: Array.from(frameworks),
      urlsFromPackageMetadata: Array.from(urlsFromPackageMetadata),
    };
  } catch {
    return {
      frameworks: [],
      urlsFromPackageMetadata: [],
    };
  }
}

async function detectGitRemotes(projectPath: string): Promise<GitRemote[]> {
  const gitConfigPath = await getGitConfigPath(projectPath);

  if (!gitConfigPath) {
    return [];
  }

  try {
    const config = await fs.readFile(gitConfigPath, "utf8");
    const remotes: GitRemote[] = [];
    let remoteName: string | undefined;

    for (const line of config.split(/\r?\n/)) {
      const sectionMatch = line.match(/^\s*\[remote "(.+)"\]\s*$/);
      const urlMatch = line.match(/^\s*url\s*=\s*(.+)\s*$/);

      if (sectionMatch) {
        remoteName = sectionMatch[1];
        continue;
      }

      if (remoteName && urlMatch) {
        const rawUrl = urlMatch[1];
        const url = normalizeGitUrl(rawUrl);
        remotes.push({
          name: remoteName,
          rawUrl,
          url,
          host: getUrlHost(url),
        });
      }
    }

    return remotes;
  } catch {
    return [];
  }
}

async function getGitConfigPath(projectPath: string): Promise<string | undefined> {
  const dotGitPath = path.join(projectPath, ".git");

  try {
    const stat = await fs.lstat(dotGitPath);

    if (stat.isDirectory()) {
      return path.join(dotGitPath, "config");
    }

    if (stat.isFile()) {
      const dotGitFile = await fs.readFile(dotGitPath, "utf8");
      const gitDirMatch = dotGitFile.match(/^gitdir:\s*(.+)\s*$/m);

      if (gitDirMatch) {
        return path.resolve(projectPath, gitDirMatch[1], "config");
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function detectLanguagesFromExtensions(projectPath: string): Promise<string[]> {
  const languages = new Set<string>();

  await walkFiles(projectPath, 0, languages);
  return Array.from(languages);
}

async function walkFiles(directoryPath: string, depth: number, languages: Set<string>): Promise<void> {
  if (depth > 2) {
    return;
  }

  let entries: Dirent[];

  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && !isIgnoredDirectoryName(entry.name)) {
      await walkFiles(path.join(directoryPath, entry.name), depth + 1, languages);
      continue;
    }

    if (entry.isFile()) {
      const language = EXTENSION_LANGUAGES[path.extname(entry.name)];

      if (language) {
        languages.add(language);
      }
    }
  }
}

async function readJavaBuildText(projectPath: string): Promise<string> {
  const files = ["pom.xml", "build.gradle", "build.gradle.kts"];
  const contents: string[] = [];

  for (const file of files) {
    try {
      contents.push(await fs.readFile(path.join(projectPath, file), "utf8"));
    } catch {
      continue;
    }
  }

  return contents.join("\n").toLowerCase();
}

function getUrlHost(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

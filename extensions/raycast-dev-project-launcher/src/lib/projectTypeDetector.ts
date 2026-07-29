import fs from "fs";
import path from "path";
import type { BuiltinProjectType } from "../types";

/**
 * Ordered marker rules used to fingerprint a directory as a specific project
 * type. Order matters: the first matching rule wins, so more specific
 * ecosystems (e.g. Flutter, which also contains a pubspec.yaml alongside
 * native android/ios folders) are checked before generic fallbacks.
 */
interface MarkerRule {
  type: BuiltinProjectType;
  label: string;
  /** Returns true if any of these glob-free file/folder names exist directly inside the project. */
  markers: string[];
  /** Optional extra predicate for cases a simple filename check can't express. */
  extra?: (dirEntries: Set<string>, dirPath: string) => boolean;
}

const RULES: MarkerRule[] = [
  {
    type: "flutter",
    label: "Flutter Project",
    markers: ["pubspec.yaml"],
  },
  {
    type: "xcode",
    label: "Xcode Project",
    markers: [],
    extra: (entries) =>
      [...entries].some((e) => e.endsWith(".xcodeproj") || e.endsWith(".xcworkspace")),
  },
  {
    type: "swift-package",
    label: "Swift Package",
    markers: ["Package.swift"],
  },
  {
    type: "android-gradle",
    label: "Android (Gradle) Project",
    markers: [],
    extra: (entries) =>
      (entries.has("build.gradle") || entries.has("build.gradle.kts")) &&
      (entries.has("settings.gradle") || entries.has("settings.gradle.kts")) &&
      entries.has("app"),
  },
  {
    type: "kotlin-gradle",
    label: "Kotlin/Gradle Project",
    markers: ["build.gradle.kts", "build.gradle", "settings.gradle.kts", "settings.gradle"],
  },
  {
    type: "rust",
    label: "Rust Crate",
    markers: ["Cargo.toml"],
  },
  {
    type: "go",
    label: "Go Module",
    markers: ["go.mod"],
  },
  {
    type: "java-maven",
    label: "Java (Maven) Project",
    markers: ["pom.xml"],
  },
  {
    type: "ruby",
    label: "Ruby Project",
    markers: ["Gemfile"],
  },
  {
    type: "python",
    label: "Python Project",
    markers: ["pyproject.toml", "setup.py", "Pipfile", "requirements.txt"],
  },
  {
    type: "typescript",
    label: "TypeScript Project",
    markers: ["tsconfig.json"],
  },
  {
    type: "node",
    label: "Node.js Project",
    markers: ["package.json"],
  },
];

export interface DetectionResult {
  type: BuiltinProjectType;
  label: string;
}

/**
 * Inspects the immediate children of `dirPath` and returns the best-matching
 * project type. Falls back to "generic" if the folder contains a `.git`
 * directory (so it's clearly a repo of *some* kind) or "unknown" otherwise.
 */
export function detectProjectType(dirPath: string, dirEntries: string[]): DetectionResult {
  const entries = new Set(dirEntries);

  for (const rule of RULES) {
    const markerHit = rule.markers.some((m) => entries.has(m));
    const extraHit = rule.extra ? rule.extra(entries, dirPath) : false;
    if (markerHit || extraHit) {
      return { type: rule.type, label: rule.label };
    }
  }

  if (entries.has(".git")) {
    return { type: "generic", label: "Git Repository" };
  }

  return { type: "generic", label: "Project Folder" };
}

/** Safely lists directory entry names, returning an empty array on failure (permissions, race conditions, etc). */
export function safeReadDir(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

/** Checks whether `dirPath` contains a `.git` folder. */
export function hasGitRepo(dirPath: string): boolean {
  try {
    return fs.existsSync(path.join(dirPath, ".git"));
  } catch {
    return false;
  }
}

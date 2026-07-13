import { promises as fs } from "fs";
import { dirname, join, relative } from "path";

export type KmpProject = {
  /** Absolute path to the folder containing the gradlew file. */
  gradlewDir: string;
  /** Path relative to the configured root, used as display name. */
  relativePath: string;
  /** Absolute path to the iOS project root (folder containing .xcodeproj/.xcworkspace) if any. */
  iosParentDir: string | null;
  /** Pretty title: "iOS project › kmp module" or just the kmp folder name. */
  title: string;
  /** Subtitle for the iOS context, undefined for standalone projects. */
  iosLabel?: string;
};

const SKIP_DIRS = new Set([
  ".git",
  ".gradle",
  ".idea",
  ".build",
  ".swiftpm",
  ".venv",
  ".cache",
  ".kotlin",
  "node_modules",
  "build",
  "DerivedData",
  "Pods",
  "Carthage",
  "vendor",
  "Library",
]);

async function detectIosParent(
  gradlewDir: string,
  root: string,
): Promise<string | null> {
  let current = dirname(gradlewDir);
  while (current.length >= root.length) {
    try {
      const entries = await fs.readdir(current, { withFileTypes: true });
      const hasIos = entries.some(
        (e) =>
          e.isDirectory() &&
          (e.name.endsWith(".xcodeproj") || e.name.endsWith(".xcworkspace")),
      );
      if (hasIos) return current;
    } catch {
      // ignore unreadable dirs
    }
    if (current === root) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export async function findKmpProjects(
  root: string,
  maxDepth = 3,
): Promise<KmpProject[]> {
  const found: { gradlewDir: string }[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && e.name === "gradlew")) {
      found.push({ gradlewDir: dir });
      return; // do not recurse into a gradle project
    }
    await Promise.all(
      entries.map(async (e) => {
        if (!e.isDirectory()) return;
        if (SKIP_DIRS.has(e.name)) return;
        await walk(join(dir, e.name), depth + 1);
      }),
    );
  }

  await walk(root, 0);

  const projects = await Promise.all(
    found.map(async ({ gradlewDir }) => {
      const iosParentDir = await detectIosParent(gradlewDir, root);
      const rel = relative(root, gradlewDir);
      const relativePath = rel === "" ? "." : rel;
      const moduleName = gradlewDir.split("/").pop() ?? gradlewDir;
      const iosName = iosParentDir
        ? (iosParentDir.split("/").pop() ?? iosParentDir)
        : null;
      const title = iosName ? `${iosName} › ${moduleName}` : moduleName;
      return {
        gradlewDir,
        relativePath,
        iosParentDir,
        title,
        iosLabel: iosName ?? undefined,
      };
    }),
  );

  return projects.sort((a, b) => a.title.localeCompare(b.title));
}

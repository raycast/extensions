import { Dirent, promises as fs } from "node:fs";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";

const OCTARINE_WORKSPACE_DIRECTORY = ".octarine";
const ATTACHMENT_DIRECTORIES = [".attachments", ".files"] as const;
const SYSTEM_GENERATED_FILE_NAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  ".spotlight-v100",
  ".trashes",
  ".fseventsd",
  ".temporaryitems",
  "ehthumbs.db",
  "ehthumbs_vista.db",
]);

/** A Markdown file with absolute and POSIX relative paths. */
export type MarkdownFile = {
  absolute: string;
  relative: string;
};

export type SplitMarkdownFrontmatter = {
  frontmatter: string;
  body: string;
};

/** A path found during workspace discovery. */
export type ScannedPath = {
  path: string;
  ignored: boolean;
  invalid: boolean;
};

/** A file found below an attachment directory. */
export type ScannedAttachmentFile = {
  name: string;
  absolute: string;
  relative: string;
};

/**
 * Finds Octarine workspaces below the configured root paths.
 *
 * A root can be a workspace or a parent of workspace directories. Missing or unreadable
 * roots return invalid entries. Excluded workspace names return ignored entries.
 *
 * @param roots - Root paths to scan.
 * @param excluded - Lowercase workspace names to mark as ignored.
 */
export async function scanPaths(roots: string[], excluded: Set<string>): Promise<ScannedPath[]> {
  const discovered = new Map<string, ScannedPath>();

  const addWorkspace = (workspacePath: string) => {
    discovered.set(workspacePath, {
      path: workspacePath,
      ignored: excluded.has(path.basename(workspacePath).toLowerCase()),
      invalid: false,
    });
  };

  const addInvalidPath = (workspacePath: string) => {
    discovered.set(workspacePath, {
      path: workspacePath,
      ignored: false,
      invalid: true,
    });
  };

  await Promise.all(
    roots.map(async (root) => {
      const resolvedRoot = path.resolve(root);

      let entries;
      try {
        entries = await fs.readdir(resolvedRoot, { withFileTypes: true });
      } catch {
        addInvalidPath(resolvedRoot);
        return;
      }

      if (entries.some((e) => e.isDirectory() && e.name === OCTARINE_WORKSPACE_DIRECTORY)) {
        addWorkspace(resolvedRoot);
        return;
      }

      const directories = entries.filter((e) => e.isDirectory() && !e.isSymbolicLink() && !e.name.startsWith("."));

      await Promise.all(
        directories.map(async (dir) => {
          const childPath = path.join(resolvedRoot, dir.name);
          try {
            const stat = await fs.stat(path.join(childPath, OCTARINE_WORKSPACE_DIRECTORY));
            if (stat.isDirectory()) addWorkspace(childPath);
          } catch {
            return;
          }
        }),
      );
    }),
  );

  return Array.from(discovered.values());
}

/**
 * Recursively finds Markdown files below a root directory.
 *
 * The scan skips excluded directories and symbolic-link directories. Relative paths use
 * forward slashes. The function throws when it cannot read a directory.
 *
 * @param root - Directory to scan.
 * @param excluded - Lowercase directory names to skip.
 */
export async function scanMarkdownFiles(root: string, excluded: Set<string>): Promise<MarkdownFile[]> {
  const pending: string[] = [root];
  const files: MarkdownFile[] = [];

  while (pending.length > 0) {
    const dir = pending.pop()!;

    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Failed to read directory ${dir}: ${toErrorMessage(error)}`);
    }

    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const name = entry.name.toLowerCase();

      if (entry.isDirectory()) {
        if (!entry.isSymbolicLink() && !excluded.has(name)) {
          pending.push(absolute);
        }
        continue;
      }

      if (!entry.isFile() || path.extname(name) !== ".md") {
        continue;
      }

      files.push({
        absolute,
        relative: toPosixPath(path.relative(root, absolute)),
      });
    }
  }

  return files;
}

/**
 * Finds files below the workspace attachment directories.
 *
 * The scan checks both .attachments and .files. Missing directories return an empty list.
 * It logs a warning and skips directories that it cannot read.
 * System-generated files and symbolic-link directories are skipped.
 *
 * @param workspacePath - Absolute path to the workspace.
 */
export async function scanWorkspaceAttachmentFiles(workspacePath: string): Promise<ScannedAttachmentFile[]> {
  const byDirectory = await Promise.all(
    ATTACHMENT_DIRECTORIES.map((dir) => scanAttachmentDirectory(workspacePath, dir)),
  );

  return byDirectory.flat();
}

/**
 * Tests whether a path points to a directory.
 *
 * The function returns false when the path cannot be read or does not point to a directory.
 *
 * @param targetPath - Path to inspect.
 */
export async function isDirectoryPath(targetPath: string): Promise<boolean> {
  try {
    return (await fs.stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Reads the frontmatter block at the start of a Markdown file.
 *
 * Frontmatter is metadata at the start of a Markdown file. The function supports a UTF-8
 * byte-order mark and closing lines marked with three dashes or three dots. It returns the
 * raw block. It returns undefined when no complete block exists. It throws when the file
 * cannot be read.
 *
 * @param filePath - Path to the Markdown file.
 */
export async function readMarkdownFrontmatter(filePath: string): Promise<string | undefined> {
  try {
    const fd = await fs.open(filePath, "r");

    try {
      const decoder = new StringDecoder("utf8");
      const buffer = Buffer.alloc(512);
      let content = "";
      let position = 0;

      while (true) {
        const { bytesRead } = await fd.read(buffer, 0, buffer.length, position);
        if (bytesRead === 0) {
          content += decoder.end();
          return extractFrontmatter(content);
        }

        position += bytesRead;
        content += decoder.write(buffer.subarray(0, bytesRead));

        const normalized = normalizeStart(content);
        if (normalized.length >= 3 && !normalized.startsWith("---")) {
          return undefined;
        }

        const frontmatter = extractFrontmatter(content);
        if (frontmatter) {
          return frontmatter;
        }
      }
    } finally {
      await fd.close();
    }
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${toErrorMessage(error)}`);
  }
}

/**
 * Splits a Markdown document at a complete, leading frontmatter block without parsing its YAML.
 *
 * The opening `---` must be the first line, apart from an optional UTF-8 BOM and trailing
 * spaces or tabs. The closing `---` or `...` must start in column zero, so a delimiter inside
 * an indented YAML block scalar is kept as frontmatter content. The body omits blank lines
 * immediately after the closing delimiter. A malformed YAML block is still split when its
 * delimiters are complete.
 *
 * @param content - Complete Markdown source.
 * @returns The frontmatter block and body, or undefined when no complete block starts the document.
 */
export function splitMarkdownFrontmatter(content: string): SplitMarkdownFrontmatter | undefined {
  const normalized = normalizeStart(content);
  const lines = normalized.match(/[^\n]*(?:\n|$)/g)?.filter((line) => line.length > 0) ?? [];
  const firstLine = lines[0]?.replace(/\r?\n$/, "");

  if (firstLine?.replace(/[ \t]+$/, "") !== "---") {
    return undefined;
  }

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].replace(/\r?\n$/, "");
    if (!/^(?:---|\.\.\.)[ \t]*$/.test(line)) {
      continue;
    }

    return {
      frontmatter: lines
        .slice(0, index + 1)
        .join("")
        .replace(/\r?\n$/, ""),
      body: lines
        .slice(index + 1)
        .join("")
        .replace(/^(?:\r?\n)+/, ""),
    };
  }

  return undefined;
}

/** Tests for common system files and temporary Office lock files. */
export function isSystemGeneratedFile(name: string): boolean {
  const normalizedName = name.toLowerCase();
  return normalizedName.startsWith("~$") || SYSTEM_GENERATED_FILE_NAMES.has(normalizedName);
}

async function scanAttachmentDirectory(
  workspacePath: string,
  directoryName: (typeof ATTACHMENT_DIRECTORIES)[number],
): Promise<ScannedAttachmentFile[]> {
  const root = path.join(workspacePath, directoryName);
  let entries: Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return [];
    }

    console.warn("Skipping unreadable attachment directory", {
      workspacePath,
      attachmentsPath: root,
      directoryName,
      error,
    });
    return [];
  }

  if (entries.length === 0) {
    return [];
  }

  const files: ScannedAttachmentFile[] = [];
  const pending: Array<{ absolute: string; relative: string; entries?: Dirent[] }> = [
    { absolute: root, relative: "", entries },
  ];

  while (pending.length > 0) {
    const next = pending.pop();
    if (!next) {
      continue;
    }

    let currentEntries = next.entries;
    if (!currentEntries) {
      try {
        currentEntries = await fs.readdir(next.absolute, { withFileTypes: true });
      } catch (error) {
        console.warn("Skipping unreadable attachments directory", {
          directory: next.absolute,
          workspacePath,
          error,
        });
        continue;
      }
    }

    for (const entry of currentEntries) {
      const absolute = path.resolve(next.absolute, entry.name);
      const relative = next.relative ? path.posix.join(next.relative, entry.name) : entry.name;

      if (entry.isDirectory()) {
        if (!entry.isSymbolicLink()) {
          pending.push({ absolute, relative });
        }
        continue;
      }

      if (!entry.isFile() || isSystemGeneratedFile(entry.name)) {
        continue;
      }

      files.push({
        name: entry.name,
        absolute,
        relative,
      });
    }
  }

  return files;
}

function toPosixPath(p: string): string {
  return p.split(path.sep).join(path.posix.sep);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function extractFrontmatter(content: string): string | undefined {
  return splitMarkdownFrontmatter(content)?.frontmatter;
}

function normalizeStart(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

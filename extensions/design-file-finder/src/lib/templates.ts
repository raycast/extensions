import { mkdir, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join } from "node:path";
import fg from "fast-glob";
import { AppKind } from "./types";
import { ALL_EXTENSIONS, defForPath } from "./extensions";

export interface TemplateRecord {
  /** absolute path to the template file */
  path: string;
  /** basename, e.g. "Square 1080.psd" */
  name: string;
  app: AppKind;
  label: string;
  ext: string;
}

/** Recursively list design-file templates under a folder. [] when folder is unset. */
export async function listTemplates(folder: string): Promise<TemplateRecord[]> {
  if (!folder) return [];
  const patterns = ALL_EXTENSIONS.map((e) => `**/*.${e}`);
  let paths: string[] = [];
  try {
    paths = await fg(patterns, {
      cwd: folder,
      absolute: true,
      onlyFiles: true,
      caseSensitiveMatch: false,
      followSymbolicLinks: false,
      suppressErrors: true,
      dot: false,
    });
  } catch {
    return [];
  }
  return paths
    .map((p) => {
      const def = defForPath(p);
      if (!def) return null;
      return { path: p, name: basename(p), app: def.app, label: def.label, ext: def.ext };
    })
    .filter((t): t is TemplateRecord => t !== null)
    .sort((a, b) => a.app.localeCompare(b.app) || a.name.localeCompare(b.name));
}

/** Make a filesystem-safe base name (no separators, no leading dots). */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[/\\:]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim();
}

export interface TargetArgs {
  destination: string;
  name: string;
  ext: string;
  wrapInFolder: boolean;
}

export interface TargetPlan {
  /** directory the new file lands in (created if needed) */
  dir: string;
  /** absolute path of the new file */
  file: string;
}

export function targetPathFor(args: TargetArgs): TargetPlan {
  const base = sanitizeName(args.name);
  if (!base || base.startsWith(".")) {
    // e.g. a name of only dots/separators would otherwise build a hidden ".ext" file.
    throw new Error("Project name has no usable characters");
  }
  const dir = args.wrapInFolder ? join(args.destination, base) : args.destination;
  return { dir, file: join(dir, `${base}.${args.ext}`) };
}

/** Copy a template into its planned location. Refuses to overwrite an existing file. */
export async function createFromTemplate(templatePath: string, plan: TargetPlan): Promise<void> {
  await mkdir(plan.dir, { recursive: true });
  try {
    // COPYFILE_EXCL fails atomically if the target exists — closes the check-then-write
    // race a separate exists() guard would leave open.
    await copyFile(templatePath, plan.file, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Already exists: ${plan.file}`);
    }
    throw error;
  }
}

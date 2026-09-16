import fs from "fs/promises";
import path from "path";
import { getSelectedFinderItems } from "@raycast/api";
import { isPlainFileName, joinName, sanitizeName, splitName } from "./paths";
import { renderTemplate, templateUsesExtension } from "./template";

export type SourceItem = {
  path: string;
  base: string;
  directory: string;
  isDirectory: boolean;
};

/** How to react when the name a copy wants is already on disk. */
export type ConflictStrategy = "unique" | "skip" | "overwrite";

export type PlannedCopy = {
  source: SourceItem;
  target: string;
};

export type DuplicateOutcome = {
  created: string[];
  skipped: { target: string; reason: string }[];
  failed: { target: string; message: string }[];
};

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
}

/** Describes a path on disk, throwing a readable error when it is gone. */
export async function describe(target: string): Promise<SourceItem> {
  const stats = await fs.stat(target);
  return {
    path: target,
    base: path.basename(target),
    directory: path.dirname(target),
    isDirectory: stats.isDirectory(),
  };
}

/**
 * Reads the current Finder selection.
 * Returns an empty array rather than throwing when Finder is not frontmost or nothing is selected,
 * so callers can decide whether that is an error or just a starting point for a form.
 */
export async function getSelection(): Promise<SourceItem[]> {
  let items: { path: string }[];
  try {
    items = await getSelectedFinderItems();
  } catch {
    return [];
  }

  const described = await Promise.all(
    items.map(async (item) => {
      try {
        return await describe(item.path);
      } catch {
        return undefined;
      }
    }),
  );

  return described.filter((item): item is SourceItem => item !== undefined);
}

const MAX_SUFFIX_ATTEMPTS = 10000;

/**
 * Finds a name in `directory` that nothing else claims, appending ` 2`, ` 3`, … to the stem.
 * `reserved` holds paths already planned in this run but not yet written.
 */
export async function uniquePath(
  directory: string,
  base: string,
  isDirectory: boolean,
  reserved: Set<string>,
): Promise<string> {
  const { stem, ext } = splitName(base, isDirectory);

  for (let attempt = 1; attempt <= MAX_SUFFIX_ATTEMPTS; attempt++) {
    const candidate = path.join(directory, attempt === 1 ? base : joinName(`${stem} ${attempt}`, ext));
    if (!reserved.has(candidate) && !(await pathExists(candidate))) {
      return candidate;
    }
  }

  throw new Error(`Could not find a free name for "${base}"`);
}

/** Copies one item, creating the destination folder if needed. */
async function copyItem(source: SourceItem, target: string, overwrite: boolean): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });

  if (overwrite) {
    // `fs.cp` with `force` still refuses to replace a file with a directory and vice versa.
    await fs.rm(target, { recursive: true, force: true });
  }

  await fs.cp(source.path, target, {
    recursive: source.isDirectory,
    errorOnExist: true,
    force: false,
  });
}

/**
 * Executes a set of planned copies, resolving conflicts as they are hit rather than up front,
 * so a name freed or taken between planning and writing is still handled correctly.
 */
export async function runCopies(plan: PlannedCopy[], conflict: ConflictStrategy): Promise<DuplicateOutcome> {
  const outcome: DuplicateOutcome = { created: [], skipped: [], failed: [] };
  const reserved = new Set(plan.map((item) => item.target));

  for (const { source, target } of plan) {
    let destination = target;
    let overwrite = false;

    if (await pathExists(destination)) {
      if (conflict === "skip") {
        outcome.skipped.push({ target: destination, reason: "Already exists" });
        continue;
      }
      if (conflict === "overwrite") {
        overwrite = true;
      } else {
        try {
          destination = await uniquePath(
            path.dirname(destination),
            path.basename(destination),
            source.isDirectory,
            reserved,
          );
          reserved.add(destination);
        } catch (error) {
          outcome.failed.push({ target: destination, message: String(error) });
          continue;
        }
      }
    }

    if (source.path === destination) {
      outcome.skipped.push({ target: destination, reason: "Same as the original" });
      continue;
    }

    try {
      await copyItem(source, destination, overwrite);
      outcome.created.push(destination);
    } catch (error) {
      outcome.failed.push({ target: destination, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return outcome;
}

/** Naming schemes offered by the Quick Duplicate command. */
export type QuickStyle = "finder" | "space" | "paren" | "dash" | "underscore";

/** Builds the stem for the `index`-th copy (1-based) in the chosen scheme. */
export function quickStem(stem: string, index: number, style: QuickStyle): string {
  switch (style) {
    case "finder":
      // Matches Finder: "file copy", then "file copy 2", "file copy 3", …
      return index === 1 ? `${stem} copy` : `${stem} copy ${index}`;
    case "space":
      return `${stem} ${index}`;
    case "paren":
      return `${stem} (${index})`;
    case "dash":
      return `${stem}-${index}`;
    case "underscore":
      return `${stem}_${index}`;
  }
}

/**
 * Plans `copies` duplicates of each source using `style`, skipping over names that are
 * already taken so a second run continues the sequence instead of colliding with it.
 */
export async function planQuickCopies(
  sources: SourceItem[],
  copies: number,
  style: QuickStyle,
): Promise<PlannedCopy[]> {
  const plan: PlannedCopy[] = [];
  const reserved = new Set<string>();

  for (const source of sources) {
    const { stem, ext } = splitName(source.base, source.isDirectory);
    let index = 1;

    for (let made = 0; made < copies; made++) {
      let target: string | undefined;

      while (index <= MAX_SUFFIX_ATTEMPTS) {
        const candidate = path.join(source.directory, joinName(quickStem(stem, index, style), ext));
        index++;
        if (!reserved.has(candidate) && !(await pathExists(candidate))) {
          target = candidate;
          break;
        }
      }

      if (!target) {
        throw new Error(`Could not find a free name for "${source.base}"`);
      }

      reserved.add(target);
      plan.push({ source, target });
    }
  }

  return plan;
}

export type TemplatePlanOptions = {
  template: string;
  copies: number;
  /** Value the counter starts at for each source file. */
  start: number;
  /** Minimum width of counters that do not carry their own padding. */
  padding: number;
  /** Folder to write into. Defaults to the folder each original lives in. */
  destination?: string;
  /** Shared clock so every copy in a run gets the same timestamp. */
  now?: Date;
};

export type TemplatePlan = {
  plan: PlannedCopy[];
  /** Tokens in the template that matched no known variable. */
  unknownTokens: string[];
  /** Copies that could not be named, e.g. the template rendered to nothing usable. */
  invalid: { source: string; message: string }[];
};

/**
 * Turns a name template into concrete targets. Pure and synchronous so the form can
 * render a live preview through exactly the same code path that performs the copy.
 */
export function planTemplateCopies(sources: SourceItem[], options: TemplatePlanOptions): TemplatePlan {
  const now = options.now ?? new Date();
  const appendExtension = !templateUsesExtension(options.template);

  const plan: PlannedCopy[] = [];
  const invalid: TemplatePlan["invalid"] = [];
  const unknownTokens = new Set<string>();

  sources.forEach((source, sourceIndex) => {
    const { stem, ext } = splitName(source.base, source.isDirectory);
    const directory = options.destination || source.directory;

    for (let copy = 0; copy < options.copies; copy++) {
      const rendered = renderTemplate(options.template, {
        stem,
        ext,
        base: source.base,
        parent: path.basename(source.directory),
        counter: options.start + copy,
        total: options.copies,
        fileIndex: sourceIndex + 1,
        fileTotal: sources.length,
        padding: options.padding,
        now,
      });

      rendered.unknown.forEach((token) => unknownTokens.add(token));

      const safe = sanitizeName(rendered.value);
      if (!safe) {
        invalid.push({ source: source.path, message: "The template produced an empty name" });
        continue;
      }

      const base = appendExtension && ext && !source.isDirectory ? joinName(safe, ext) : safe;
      if (!isPlainFileName(base)) {
        invalid.push({ source: source.path, message: `"${base}" is not a usable file name` });
        continue;
      }

      plan.push({ source, target: path.join(directory, base) });
    }
  });

  return { plan, unknownTokens: [...unknownTokens], invalid };
}

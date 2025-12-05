import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import matter from "gray-matter";
import { getCachedNotes, setCachedNotes, isCacheFresh } from "./cache";

const TAG_INLINE = /(^|\\s)#([A-Za-z0-9/_-]+)/g;
const H1_REGEX = /^#\\s+(.+?)\\s*$/m;

type CachedNote = {
  path: string;
  relativePath: string;
  title: string;
  tags: string[];
  frontmatter: Record<string, unknown>;
  mtimeMs: number;
};

type VaultCache = {
  version: number;
  vaultPath: string;
  createdAt: string;
  notes: CachedNote[];
};

export type Note = {
  title: string;
  path: string;
  relativePath: string;
  tags: string[];
  mtimeMs: number;
  hasTodoTag: boolean;
  hasProjectTag: boolean;
  status?: string;
  project?: string;
  dateDue?: string;
  dateStarted?: string;
  dateScheduled?: string;
  recurrence?: string;
  recurrenceAnchor?: string;
  priority?: string;
  timeTracked?: number;
  timeEstimate?: number;
};

function normalizeTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value))
    return value
      .flatMap((v) => (typeof v === "string" ? v.split(/[,\s]+/) : []))
      .map((t) => t.trim())
      .filter(Boolean);
  if (typeof value === "string")
    return value
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  return [];
}

function extractInlineTags(content: string): string[] {
  const set = new Set<string>();
  for (const m of content.matchAll(TAG_INLINE)) {
    const tag = (m[2] ?? "").trim();
    if (tag) set.add(tag);
  }
  return [...set];
}

function extractTitle(content: string, fmTitle: unknown, fallback: string) {
  if (typeof fmTitle === "string" && fmTitle.trim()) return fmTitle.trim();
  const h1 = content.match(H1_REGEX)?.[1];
  return h1 ? h1.trim() : fallback;
}

/**
 * Get the cache file path for a vault
 */
function getCachePath(vaultPath: string): string {
  return path.join(vaultPath, ".hyperdash", "cache.json");
}

/**
 * Read cache from disk if it exists
 */
export async function readCache(vaultPath: string): Promise<VaultCache | null> {
  try {
    const cachePath = getCachePath(vaultPath);
    const raw = await fs.readFile(cachePath, "utf8");
    const cache = JSON.parse(raw) as VaultCache;

    // Validate cache version
    if (cache.version !== 1) return null;
    if (cache.vaultPath !== vaultPath) return null;

    return cache;
  } catch {
    return null;
  }
}

/**
 * Write cache to disk
 */
export async function writeCache(
  vaultPath: string,
  notes: CachedNote[],
): Promise<void> {
  try {
    const cachePath = getCachePath(vaultPath);
    const cacheDir = path.dirname(cachePath);

    // Ensure cache directory exists
    await fs.mkdir(cacheDir, { recursive: true });

    const cache: VaultCache = {
      version: 1,
      vaultPath,
      createdAt: new Date().toISOString(),
      notes,
    };

    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");
  } catch (error) {
    // Silently fail - caching is optional
    console.error("Failed to write cache:", error);
  }
}

export async function scanVault(opts: {
  vaultPath: string;
  todoTags: string[];
  projectTags: string[];
  filterFn?: (note: Note) => Note | null;
  useCache?: boolean;
  maxAge?: number;
}): Promise<Note[]> {
  const {
    vaultPath,
    todoTags,
    projectTags,
    filterFn,
    useCache = true,
    maxAge = 5 * 60 * 1000,
  } = opts;

  // Try Raycast Cache API first
  if (useCache) {
    const cached = getCachedNotes(vaultPath);
    if (cached && isCacheFresh(vaultPath, maxAge)) {
      console.log(`[Cache] Hit for ${vaultPath}, ${cached.length} notes`);

      // Apply filter if provided
      if (filterFn) {
        const filtered: Note[] = [];
        for (const note of cached) {
          const result = filterFn(note);
          if (result !== null) {
            filtered.push(result);
          }
        }
        return filtered;
      }

      return cached;
    } else {
      console.log(`[Cache] Miss for ${vaultPath}, scanning...`);
    }
  }

  // Cache miss or disabled - scan vault
  const entries = await fg(["**/*.md", "**/*.markdown"], {
    cwd: vaultPath,
    ignore: [
      "**/.obsidian/**",
      "**/.git/**",
      "**/node_modules/**",
      "**/log/**",
      "**/Clippings/**",
      "**/files/**",
      "**/.trash/**",
    ],
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false,
  });

  const notes: Note[] = [];
  const cachedNotes: CachedNote[] = []; // For building cache

  // Process files in batches to balance speed and memory usage
  const BATCH_SIZE = 100;
  const limitedEntries = entries; // Process all files for cache

  // Combine todo and project tags for filtering
  const requiredTags = [...todoTags, ...projectTags].map((t) =>
    t.toLowerCase(),
  );
  console.log(
    `[Scan] Found ${entries.length} files, filtering for tags: ${requiredTags.join(", ")}`,
  );

  for (let i = 0; i < limitedEntries.length; i += BATCH_SIZE) {
    const batch = limitedEntries.slice(i, i + BATCH_SIZE);
    const batchNotes = await Promise.all(
      batch.map(async (rel) => {
        const abs = path.join(vaultPath, rel);
        try {
          const [raw, st] = await Promise.all([
            fs.readFile(abs, "utf8"),
            fs.stat(abs),
          ]);
          const parsed = matter(raw);
          const fmTags = normalizeTags(
            (parsed.data as Record<string, unknown>)?.tags,
          );
          const inlineTags = extractInlineTags(parsed.content);
          const tags = [...new Set([...fmTags, ...inlineTags])].map((t) =>
            t.toLowerCase(),
          );

          // EARLY FILTER: Skip files that don't have any of the required tags
          // This prevents memory exhaustion on large vaults
          if (
            requiredTags.length > 0 &&
            !requiredTags.some((reqTag) => tags.includes(reqTag))
          ) {
            return null;
          }

          const title = extractTitle(
            parsed.content,
            (parsed.data as Record<string, unknown>)?.title,
            path.parse(rel).name,
          );

          // Store in cache (all frontmatter)
          cachedNotes.push({
            path: abs,
            relativePath: rel,
            title,
            tags,
            frontmatter: parsed.data || {},
            mtimeMs: st.mtimeMs,
          });

          // Extract status and project from frontmatter
          const rawStatus =
            (parsed.data as Record<string, unknown>)?.status ||
            (parsed.data as Record<string, unknown>)?.Status;
          const status =
            typeof rawStatus === "string"
              ? rawStatus.trim().toLowerCase()
              : undefined;

          const rawProject =
            (parsed.data as Record<string, unknown>)?.project ||
            (parsed.data as Record<string, unknown>)?.Project;
          const project =
            typeof rawProject === "string"
              ? rawProject.trim().replace(/^\[\[|\]\]$/g, "")
              : undefined;

          // Extract date fields from frontmatter (support various naming conventions)
          const rawDateDue =
            (parsed.data as Record<string, unknown>)?.date_due ||
            (parsed.data as Record<string, unknown>)?.dateDue ||
            (parsed.data as Record<string, unknown>)?.due_date ||
            (parsed.data as Record<string, unknown>)?.due;
          const dateDue =
            typeof rawDateDue === "string" ? rawDateDue.trim() : undefined;

          const rawDateStarted =
            (parsed.data as Record<string, unknown>)?.date_started ||
            (parsed.data as Record<string, unknown>)?.dateStarted ||
            (parsed.data as Record<string, unknown>)?.start_date ||
            (parsed.data as Record<string, unknown>)?.started;
          const dateStarted =
            typeof rawDateStarted === "string"
              ? rawDateStarted.trim()
              : undefined;

          const rawDateScheduled =
            (parsed.data as Record<string, unknown>)?.date_scheduled ||
            (parsed.data as Record<string, unknown>)?.dateScheduled ||
            (parsed.data as Record<string, unknown>)?.scheduled;
          const dateScheduled =
            typeof rawDateScheduled === "string"
              ? rawDateScheduled.trim()
              : undefined;

          // Extract recurrence fields (TaskNotes 4.0.1 compatibility)
          const rawRecurrence = (parsed.data as Record<string, unknown>)
            ?.recurrence;
          const recurrence =
            typeof rawRecurrence === "string"
              ? rawRecurrence.trim()
              : undefined;

          const rawRecurrenceAnchor =
            (parsed.data as Record<string, unknown>)?.recurrence_anchor ||
            (parsed.data as Record<string, unknown>)?.recurrenceAnchor;
          const recurrenceAnchor =
            typeof rawRecurrenceAnchor === "string"
              ? rawRecurrenceAnchor.trim()
              : undefined;

          // Extract priority (alphabetical sorting as per TaskNotes 4.0.1)
          const rawPriority =
            (parsed.data as Record<string, unknown>)?.priority ||
            (parsed.data as Record<string, unknown>)?.Priority;
          const priority =
            typeof rawPriority === "string" ? rawPriority.trim() : undefined;

          // Extract time tracking fields
          const rawTimeTracked =
            (parsed.data as Record<string, unknown>)?.time_tracked ||
            (parsed.data as Record<string, unknown>)?.timeTracked;
          const timeTracked =
            typeof rawTimeTracked === "number" ? rawTimeTracked : undefined;

          const rawTimeEstimate =
            (parsed.data as Record<string, unknown>)?.time_estimate ||
            (parsed.data as Record<string, unknown>)?.timeEstimate;
          const timeEstimate =
            typeof rawTimeEstimate === "number" ? rawTimeEstimate : undefined;

          // Check if note has any of the specified todo or project tags
          const hasTodoTag = todoTags.some((todoTag) => tags.includes(todoTag));
          const hasProjectTag = projectTags.some((projectTag) =>
            tags.includes(projectTag),
          );

          // NOTE: With dynamic filtering from base files, we no longer filter out
          // done/canceled todos here. The base file filters control what gets shown.
          // This allows users to configure their own filtering logic in the base files.

          return {
            title,
            path: abs,
            relativePath: rel,
            tags,
            mtimeMs: st.mtimeMs,
            hasTodoTag,
            hasProjectTag,
            status,
            project,
            dateDue,
            dateStarted,
            dateScheduled,
            recurrence,
            recurrenceAnchor,
            priority,
            timeTracked,
            timeEstimate,
          };
        } catch {
          // ignore unreadable file
          return null;
        }
      }),
    );

    // Filter out nulls only - do NOT apply filterFn during scan
    // We want to cache unfiltered data and apply filters on retrieval
    for (const note of batchNotes) {
      if (note !== null) {
        notes.push(note);
      }
    }
  }

  console.log(`[Scan] Filtered to ${notes.length} notes with matching tags`);

  // Store all scanned notes in Raycast Cache (UNFILTERED)
  // This allows different filters to be applied to the same cached data
  if (useCache) {
    setCachedNotes(vaultPath, notes);
    console.log(
      `[Cache] Stored ${notes.length} unfiltered notes for ${vaultPath}`,
    );
  }

  // Also write to vault cache for backwards compatibility (can be removed later)
  await writeCache(vaultPath, cachedNotes);

  // NOW apply filter to the scanned notes before returning
  if (filterFn) {
    const filtered: Note[] = [];
    for (const note of notes) {
      const result = filterFn(note);
      if (result !== null) {
        filtered.push(result);
      }
    }
    console.log(
      `[Filter] Applied filter: ${notes.length} → ${filtered.length} notes`,
    );
    return filtered;
  }

  return notes;
}

export function sortByMtimeDesc(a: Note, b: Note) {
  return b.mtimeMs - a.mtimeMs;
}

export async function updateNoteStatus(
  filePath: string,
  newStatus: string,
): Promise<void> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  // Update status in frontmatter (try both lowercase and capitalized)
  if (parsed.data) {
    parsed.data.status = newStatus;
    // Also update Status if it exists
    if (parsed.data.Status !== undefined) {
      parsed.data.Status = newStatus;
    }
    // Update dateModified
    parsed.data.dateModified = new Date().toISOString();
  }

  // Stringify back to markdown with frontmatter
  const updated = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(filePath, updated, "utf8");
}

export async function updateNoteDate(
  filePath: string,
  field: string,
  date: Date | null,
): Promise<void> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  if (parsed.data) {
    // If date is null, remove the field
    if (date === null) {
      delete parsed.data[field];
    } else {
      // Format date as YYYY-MM-DD
      const dateStr = date.toISOString().split("T")[0];
      parsed.data[field] = dateStr;
    }
    // Update dateModified
    parsed.data.dateModified = new Date().toISOString();
  }

  // Stringify back to markdown with frontmatter
  const updated = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(filePath, updated, "utf8");
}

export async function updateNoteProject(
  filePath: string,
  project: string,
): Promise<void> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  if (parsed.data) {
    // If project is empty, remove the field
    if (!project || project.trim() === "") {
      delete parsed.data.project;
      delete parsed.data.Project;
    } else {
      // Set project field (try both lowercase and capitalized)
      parsed.data.project = project.trim();
      // Also update Project if it exists
      if (parsed.data.Project !== undefined) {
        parsed.data.Project = project.trim();
      }
    }
    // Update dateModified
    parsed.data.dateModified = new Date().toISOString();
  }

  // Stringify back to markdown with frontmatter
  const updated = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(filePath, updated, "utf8");
}

export async function updateNotePriority(filePath: string, priority: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  if (priority) {
    parsed.data.priority = priority;
  } else {
    delete parsed.data.priority;
  }
  parsed.data.dateModified = new Date().toISOString();

  const updated = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(filePath, updated, "utf8");
}

export async function updateNoteTitle(
  filePath: string,
  newTitle: string,
): Promise<string> {
  // Update frontmatter and content
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  // Update title in frontmatter if present
  if (parsed.data.title !== undefined) {
    parsed.data.title = newTitle;
  }

  // Update H1 heading in content
  const lines = parsed.content.split("\n");
  if (lines[0]?.startsWith("# ")) {
    lines[0] = `# ${newTitle}`;
    parsed.content = lines.join("\n");
  }

  parsed.data.dateModified = new Date().toISOString();
  const updated = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(filePath, updated, "utf8");

  // Rename file
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const sanitizedTitle = newTitle.replace(/[/\\?%*:|"<>]/g, "-"); // Remove invalid chars
  const newPath = path.join(dir, `${sanitizedTitle}${ext}`);

  if (filePath !== newPath) {
    await fs.rename(filePath, newPath);
  }

  return newPath;
}

export async function scanProjects(
  vaultPath: string,
  projectTags: string[],
): Promise<string[]> {
  const entries = await fg(["**/*.md", "**/*.markdown"], {
    cwd: vaultPath,
    ignore: [
      "**/.obsidian/**",
      "**/.git/**",
      "**/node_modules/**",
      "**/log/**",
      "**/archive/**",
    ],
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false,
  });

  const projects: Set<string> = new Set();

  await Promise.all(
    entries.slice(0, 5000).map(async (rel) => {
      const abs = path.join(vaultPath, rel);
      try {
        const raw = await fs.readFile(abs, "utf8");
        const parsed = matter(raw);
        const fmTags = normalizeTags(
          (parsed.data as Record<string, unknown>)?.tags,
        );
        const inlineTags = extractInlineTags(parsed.content);
        const tags = [...new Set([...fmTags, ...inlineTags])].map((t) =>
          t.toLowerCase(),
        );

        // Check if note has any of the specified project tags
        const hasProjectTag = projectTags.some((projectTag) =>
          tags.includes(projectTag),
        );
        if (hasProjectTag) {
          // Extract title from filename (remove .md extension)
          const title = path.parse(rel).name;
          projects.add(title);
        }
      } catch {
        // ignore unreadable file
      }
    }),
  );

  return Array.from(projects).sort();
}

/**
 * Detect the most common folder where notes with the given tags exist
 * Returns the folder path relative to vault root, or empty string for vault root
 *
 * OPTIMIZATION: Uses cached notes if available to avoid scanning entire vault
 */
async function detectFolderForTags(
  vaultPath: string,
  tags: string[],
  cachedNotes?: Note[],
): Promise<string> {
  try {
    // If we have cached notes, use them (much faster!)
    if (cachedNotes && cachedNotes.length > 0) {
      const folderCounts = new Map<string, number>();

      for (const note of cachedNotes) {
        // Check if this note has any of the target tags
        const hasTag = tags.some((tag) =>
          note.tags.includes(tag.toLowerCase()),
        );

        if (hasTag) {
          // Get the folder path (directory of the file)
          const folder = path.dirname(note.relativePath);
          const currentCount = folderCounts.get(folder) || 0;
          folderCounts.set(folder, currentCount + 1);
        }
      }

      // Find the folder with the most notes
      let bestFolder = "";
      let maxCount = 0;

      for (const [folder, count] of folderCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestFolder = folder === "." ? "" : folder;
        }
      }

      if (bestFolder) return bestFolder;
    }

    // Fallback: scan vault (slower, but works if no cache)
    const entries = await fg(["**/*.md", "**/*.markdown"], {
      cwd: vaultPath,
      ignore: [
        "**/.obsidian/**",
        "**/.git/**",
        "**/node_modules/**",
        "**/log/**",
        "**/Clippings/**",
        "**/files/**",
        "**/.trash/**",
      ],
      onlyFiles: true,
      unique: true,
      followSymbolicLinks: false,
    });

    // Count folders where notes with these tags exist
    const folderCounts = new Map<string, number>();

    // Only scan first 100 files for speed
    const sampled = entries.slice(0, 100);

    for (const rel of sampled) {
      try {
        const abs = path.join(vaultPath, rel);
        const raw = await fs.readFile(abs, "utf8");
        const parsed = matter(raw);
        const fmTags = normalizeTags(
          (parsed.data as Record<string, unknown>)?.tags,
        );
        const inlineTags = extractInlineTags(parsed.content);
        const noteTags = [...new Set([...fmTags, ...inlineTags])].map((t) =>
          t.toLowerCase(),
        );

        // Check if this note has any of the target tags
        const hasTag = tags.some((tag) => noteTags.includes(tag.toLowerCase()));

        if (hasTag) {
          // Get the folder path (directory of the file)
          const folder = path.dirname(rel);
          const currentCount = folderCounts.get(folder) || 0;
          folderCounts.set(folder, currentCount + 1);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    // Find the folder with the most notes
    let bestFolder = "";
    let maxCount = 0;

    for (const [folder, count] of folderCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        bestFolder = folder === "." ? "" : folder;
      }
    }

    return bestFolder;
  } catch {
    // If detection fails, return vault root
    return "";
  }
}

export async function createProjectNote(
  vaultPath: string,
  projectName: string,
  projectTags: string[],
  dateStarted?: Date,
  dateDue?: Date,
  cachedNotes?: Note[],
): Promise<string> {
  // Detect the best folder for this project based on existing notes with same tags
  const folder = await detectFolderForTags(vaultPath, projectTags, cachedNotes);
  const fileName = `${projectName}.md`;
  const filePath = folder
    ? path.join(vaultPath, folder, fileName)
    : path.join(vaultPath, fileName);

  // Check if file already exists
  try {
    await fs.access(filePath);
    // File exists, return path
    return filePath;
  } catch {
    // File doesn't exist, create it
    const now = new Date().toISOString();

    // Build frontmatter with all TaskNotes properties
    let frontmatter = `---
tags:\n`;

    // Add all tags
    for (const tag of projectTags) {
      frontmatter += `  - ${tag}\n`;
    }

    frontmatter += `dateCreated: ${now}
dateModified: ${now}`;

    if (dateStarted) {
      const dateStr = dateStarted.toISOString().split("T")[0];
      frontmatter += `\ndate_started: ${dateStr}`;
    }

    if (dateDue) {
      const dateStr = dateDue.toISOString().split("T")[0];
      frontmatter += `\ndate_due: ${dateStr}`;
    }

    // Add all TaskNotes properties with defaults
    frontmatter += `\npriority: ""`;
    frontmatter += `\nproject: ""`;
    frontmatter += `\nrecurrence: ""`;
    frontmatter += `\nrecurrence_anchor: ""`;
    frontmatter += `\nstatus: planning`;
    frontmatter += `\ntime_estimate: 0`;
    frontmatter += `\ntime_tracked: 0`;

    frontmatter += `\n---\n\n# ${projectName}\n\n`;

    // Ensure folder exists
    if (folder) {
      await fs.mkdir(path.join(vaultPath, folder), { recursive: true });
    }

    await fs.writeFile(filePath, frontmatter, "utf8");
    return filePath;
  }
}

export async function createTodoNote(
  vaultPath: string,
  todoTitle: string,
  todoTags: string[],
  dateStarted?: Date,
  dateDue?: Date,
  cachedNotes?: Note[],
): Promise<string> {
  // Detect the best folder for this todo based on existing notes with same tags
  const folder = await detectFolderForTags(vaultPath, todoTags, cachedNotes);
  const fileName = `${todoTitle}.md`;
  const filePath = folder
    ? path.join(vaultPath, folder, fileName)
    : path.join(vaultPath, fileName);

  // Check if file already exists
  try {
    await fs.access(filePath);
    // File exists, return the path
    return filePath;
  } catch {
    // File doesn't exist, create it
    const now = new Date().toISOString();

    // Build frontmatter with all TaskNotes properties
    let frontmatter = `---
tags:\n`;

    // Add all tags
    for (const tag of todoTags) {
      frontmatter += `  - ${tag}\n`;
    }

    frontmatter += `dateCreated: ${now}
dateModified: ${now}`;

    if (dateStarted) {
      const dateStr = dateStarted.toISOString().split("T")[0];
      frontmatter += `\ndate_started: ${dateStr}`;
    }

    if (dateDue) {
      const dateStr = dateDue.toISOString().split("T")[0];
      frontmatter += `\ndate_due: ${dateStr}`;
    }

    // Add all TaskNotes properties with defaults
    frontmatter += `\npriority: ""`;
    frontmatter += `\nproject: ""`;
    frontmatter += `\nrecurrence: ""`;
    frontmatter += `\nrecurrence_anchor: ""`;
    frontmatter += `\nstatus: todo`;
    frontmatter += `\ntime_estimate: 0`;
    frontmatter += `\ntime_tracked: 0`;

    frontmatter += `\n---\n\n# ${todoTitle}\n\n`;

    // Ensure folder exists
    if (folder) {
      await fs.mkdir(path.join(vaultPath, folder), { recursive: true });
    }

    await fs.writeFile(filePath, frontmatter, "utf8");
    return filePath;
  }
}

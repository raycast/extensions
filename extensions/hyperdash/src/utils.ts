import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import matter from "gray-matter";

const TAG_INLINE = /(^|\\s)#([A-Za-z0-9/_-]+)/g;
const H1_REGEX = /^#\\s+(.+?)\\s*$/m;

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
  if (Array.isArray(value)) return value.flatMap((v) => (typeof v === "string" ? v.split(/[,\s]+/) : [])).map((t) => t.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
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

export async function scanVault(opts: { vaultPath: string; todoTags: string[]; projectTags: string[] }): Promise<Note[]> {
  const { vaultPath, todoTags, projectTags } = opts;
  const entries = await fg(["**/*.md", "**/*.markdown"], {
    cwd: vaultPath,
    ignore: ["**/.obsidian/**", "**/.git/**", "**/node_modules/**", "**/log/**", "**/archive/**"],
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false
  });

  // Limit to first 5000 files to prevent memory issues
  const limitedEntries = entries.slice(0, 5000);

  const notes: Note[] = [];
  await Promise.all(
    limitedEntries.map(async (rel) => {
      const abs = path.join(vaultPath, rel);
      try {
        const [raw, st] = await Promise.all([fs.readFile(abs, "utf8"), fs.stat(abs)]);
        const parsed = matter(raw);
        const fmTags = normalizeTags((parsed.data as any)?.tags);
        const inlineTags = extractInlineTags(parsed.content);
        const tags = [...new Set([...fmTags, ...inlineTags])].map((t) => t.toLowerCase());
        const title = extractTitle(parsed.content, (parsed.data as any)?.title, path.parse(rel).name);

        // Extract status and project from frontmatter
        const rawStatus = (parsed.data as any)?.status || (parsed.data as any)?.Status;
        const status = typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : undefined;

        const rawProject = (parsed.data as any)?.project || (parsed.data as any)?.Project;
        const project = typeof rawProject === "string" ? rawProject.trim().replace(/^\[\[|\]\]$/g, "") : undefined;

        // Extract date fields from frontmatter (support various naming conventions)
        const rawDateDue = (parsed.data as any)?.date_due || (parsed.data as any)?.dateDue || (parsed.data as any)?.due_date || (parsed.data as any)?.due;
        const dateDue = typeof rawDateDue === "string" ? rawDateDue.trim() : undefined;

        const rawDateStarted = (parsed.data as any)?.date_started || (parsed.data as any)?.dateStarted || (parsed.data as any)?.start_date || (parsed.data as any)?.started;
        const dateStarted = typeof rawDateStarted === "string" ? rawDateStarted.trim() : undefined;

        const rawDateScheduled = (parsed.data as any)?.date_scheduled || (parsed.data as any)?.dateScheduled || (parsed.data as any)?.scheduled;
        const dateScheduled = typeof rawDateScheduled === "string" ? rawDateScheduled.trim() : undefined;

        // Extract recurrence fields (TaskNotes 4.0.1 compatibility)
        const rawRecurrence = (parsed.data as any)?.recurrence;
        const recurrence = typeof rawRecurrence === "string" ? rawRecurrence.trim() : undefined;

        const rawRecurrenceAnchor = (parsed.data as any)?.recurrence_anchor || (parsed.data as any)?.recurrenceAnchor;
        const recurrenceAnchor = typeof rawRecurrenceAnchor === "string" ? rawRecurrenceAnchor.trim() : undefined;

        // Extract priority (alphabetical sorting as per TaskNotes 4.0.1)
        const rawPriority = (parsed.data as any)?.priority || (parsed.data as any)?.Priority;
        const priority = typeof rawPriority === "string" ? rawPriority.trim() : undefined;

        // Extract time tracking fields
        const rawTimeTracked = (parsed.data as any)?.time_tracked || (parsed.data as any)?.timeTracked;
        const timeTracked = typeof rawTimeTracked === "number" ? rawTimeTracked : undefined;

        const rawTimeEstimate = (parsed.data as any)?.time_estimate || (parsed.data as any)?.timeEstimate;
        const timeEstimate = typeof rawTimeEstimate === "number" ? rawTimeEstimate : undefined;

        // Check if note has any of the specified todo or project tags
        const hasTodoTag = todoTags.some(todoTag => tags.includes(todoTag));
        const hasProjectTag = projectTags.some(projectTag => tags.includes(projectTag));

        // Filter out done and canceled todos (but not projects)
        const isDoneOrCanceled = status === "done" || status === "canceled" || status === "cancelled";
        if (isDoneOrCanceled && hasTodoTag && !hasProjectTag) {
          return; // Skip this todo note
        }

        notes.push({
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
          timeEstimate
        });
      } catch {
        // ignore unreadable file
      }
    })
  );
  return notes;
}

export function sortByMtimeDesc(a: Note, b: Note) {
  return b.mtimeMs - a.mtimeMs;
}

export async function updateNoteStatus(filePath: string, newStatus: string): Promise<void> {
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

export async function updateNoteDate(filePath: string, field: string, date: Date | null): Promise<void> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);

  if (parsed.data) {
    // If date is null, remove the field
    if (date === null) {
      delete parsed.data[field];
    } else {
      // Format date as YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0];
      parsed.data[field] = dateStr;
    }
    // Update dateModified
    parsed.data.dateModified = new Date().toISOString();
  }

  // Stringify back to markdown with frontmatter
  const updated = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(filePath, updated, "utf8");
}

export async function updateNoteProject(filePath: string, project: string): Promise<void> {
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

export async function scanProjects(vaultPath: string, projectTags: string[]): Promise<string[]> {
  const entries = await fg(["**/*.md", "**/*.markdown"], {
    cwd: vaultPath,
    ignore: ["**/.obsidian/**", "**/.git/**", "**/node_modules/**", "**/log/**", "**/archive/**"],
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: false
  });

  const projects: Set<string> = new Set();

  await Promise.all(
    entries.slice(0, 5000).map(async (rel) => {
      const abs = path.join(vaultPath, rel);
      try {
        const raw = await fs.readFile(abs, "utf8");
        const parsed = matter(raw);
        const fmTags = normalizeTags((parsed.data as any)?.tags);
        const inlineTags = extractInlineTags(parsed.content);
        const tags = [...new Set([...fmTags, ...inlineTags])].map((t) => t.toLowerCase());

        // Check if note has any of the specified project tags
        const hasProjectTag = projectTags.some(projectTag => tags.includes(projectTag));
        if (hasProjectTag) {
          // Extract title from filename (remove .md extension)
          const title = path.parse(rel).name;
          projects.add(title);
        }
      } catch {
        // ignore unreadable file
      }
    })
  );

  return Array.from(projects).sort();
}

export async function createProjectNote(
  vaultPath: string,
  projectName: string,
  projectTag: string,
  dateStarted?: Date,
  dateDue?: Date
): Promise<void> {
  const fileName = `${projectName}.md`;
  const filePath = path.join(vaultPath, fileName);

  // Check if file already exists
  try {
    await fs.access(filePath);
    // File exists, don't create
    return;
  } catch {
    // File doesn't exist, create it
    const now = new Date().toISOString();

    // Build frontmatter with optional dates
    let frontmatter = `---
tags:
  - ${projectTag}
status: planning
dateCreated: ${now}
dateModified: ${now}`;

    if (dateStarted) {
      const dateStr = dateStarted.toISOString().split('T')[0];
      frontmatter += `\ndate_started: ${dateStr}`;
    }

    if (dateDue) {
      const dateStr = dateDue.toISOString().split('T')[0];
      frontmatter += `\ndate_due: ${dateStr}`;
    }

    frontmatter += `\n---\n\n# ${projectName}\n\n`;

    await fs.writeFile(filePath, frontmatter, "utf8");
  }
}

export async function createTodoNote(
  vaultPath: string,
  todoTitle: string,
  todoTag: string,
  dateStarted?: Date,
  dateDue?: Date
): Promise<string> {
  const fileName = `${todoTitle}.md`;
  const filePath = path.join(vaultPath, fileName);

  // Check if file already exists
  try {
    await fs.access(filePath);
    // File exists, return the path
    return filePath;
  } catch {
    // File doesn't exist, create it
    const now = new Date().toISOString();

    // Build frontmatter with optional dates
    let frontmatter = `---
tags:
  - ${todoTag}
status: todo
dateCreated: ${now}
dateModified: ${now}`;

    if (dateStarted) {
      const dateStr = dateStarted.toISOString().split('T')[0];
      frontmatter += `\ndate_started: ${dateStr}`;
    }

    if (dateDue) {
      const dateStr = dateDue.toISOString().split('T')[0];
      frontmatter += `\ndate_due: ${dateStr}`;
    }

    frontmatter += `\n---\n\n# ${todoTitle}\n\n`;

    await fs.writeFile(filePath, frontmatter, "utf8");
    return filePath;
  }
}

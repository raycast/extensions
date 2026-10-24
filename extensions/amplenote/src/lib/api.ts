import { randomUUID } from "node:crypto";
import { ToolCaller } from "./mcp";

export type Note = {
  uuid: string;
  name: string | null;
  tags: string[];
  changed?: string;
  created?: string;
  updated?: string;
  published?: boolean;
  shared?: boolean;
  vault?: boolean;
  archived?: boolean;
};

export type NoteSortOrder = "opened" | "changed" | "created" | "title";

export type Tag = {
  text: string;
  color?: string | null;
  noteCount?: number;
};

export type Task = {
  uuid: string;
  noteUUID: string;
  content: string | null;
  startAt: number | null;
  deadline: number | null;
  hideUntil: number | null;
  important: boolean;
  urgent: boolean;
  isRepeating: boolean;
  completedAt?: number;
  dismissedAt?: number;
  createdAt?: number | null;
  endAt?: number;
  score?: number;
  repeat?: string;
};

export type TaskDomain = {
  uuid: string;
  name: string;
  notes: { uuid: string }[];
};

export type DomainTask = Task & { domainUUIDs: string[] };

export type NewTask = {
  content: string;
  startAt?: number | null;
  deadline?: number | null;
  important?: boolean;
  urgent?: boolean;
  /** Fixed-schedule repeat in Amplenote's "DTSTART:…\nRRULE:…" format. */
  repeat?: string | null;
  hideUntil?: number | null;
};

export function isInTaskDomain(domains: TaskDomain[], noteUUID: string): boolean {
  return domains.some((domain) => domain.notes.some((note) => note.uuid === noteUUID));
}

export function noteUrl(noteUUID: string): string {
  return `https://www.amplenote.com/notes/${noteUUID}`;
}

export function noteAppUrl(noteUUID: string): string {
  return `amplenote://notes/${noteUUID}`;
}

const PLUGIN_TAG = "plugins";

function isPluginTag(tag: string): boolean {
  return tag === PLUGIN_TAG || tag.startsWith(`${PLUGIN_TAG}/`);
}

function withoutPluginNotes(notes: Note[]): Note[] {
  return notes.filter((note) => !note.tags.some(isPluginTag));
}

const PREVIEW_LIMIT = 20_000;

const LIST_ITEM = String.raw`[ \t]*(?:[-*+]|\d+\.) `;

export const TAG_PATTERN = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/;

export function normalizeTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^\/+|\/+$/g, "");
}

/** A step that runs after a note or task was saved. Steps can fail and be retried on their own. */
export type NoteStep = { kind: "content"; markdown: string } | { kind: "taskDomain"; taskDomainUUID: string };

export function describeNoteSteps(steps: NoteStep[]): string {
  return steps.map((step) => (step.kind === "content" ? "add its content" : "add it to the task domain")).join(" or ");
}

export function isTemporaryId(noteUUID: string): boolean {
  return noteUUID.startsWith("local-");
}

export function matchNoteByName(notes: Note[], name: string): Note | undefined {
  const wanted = name.trim().toLowerCase();
  const matches = notes.filter((note) => note.name?.trim().toLowerCase() === wanted);
  return matches.find((note) => !note.archived) ?? matches[0];
}

export function displayMarkdown(markdown: string, { headingOffset = 2, limit = PREVIEW_LIMIT } = {}): string {
  let text = markdown;
  let truncated = false;
  if (text.length > limit) {
    const cut = text.lastIndexOf("\n", limit);
    text = text.slice(0, cut > limit / 2 ? cut : limit);
    truncated = true;
  }
  text = text
    .replace(/<!-- \{.*?\} -->/g, "")
    .replace(/^\[\^[^\]]+\]:.*(?:\n(?: {4}.*|[ \t]*))*$/gm, "")
    .replace(/\[([^\]]+)\]\[\^[^\]]+\]/g, "$1")
    .replace(/ ?\[\^[^\]]+\]/g, "")
    .replace(/^(#{1,6}) /gm, (_, hashes: string) => `${"#".repeat(Math.min(hashes.length + headingOffset, 6))} `)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, url: string) =>
      url.startsWith("http") ? `![${alt}](${url}${url.includes("?") ? "&" : "?"}raycast-height=120)` : "",
    )
    .replace(/^\\$/gm, "")
    .replace(new RegExp(`(^${LIST_ITEM}.*)\\n[ \\t]*\\n(?=${LIST_ITEM})`, "gm"), "$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return truncated ? `${text}\n\n---\n\n_Preview shortened. Open the note in Amplenote to read all of it._` : text;
}

export function noteTitle(note: { name: string | null } | undefined): string {
  return note?.name || "Untitled note";
}

export function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function dailyJotName(date: Date): string {
  const day = date.getDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10];
  const month = date.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${day}${suffix ?? "th"}, ${date.getFullYear()}`;
}

export function createApi(call: ToolCaller, { dailyJotTag = "daily-jots" } = {}) {
  // For tools whose response fields are read: anything but an object means Amplenote answered something unexpected.
  const read = async <T extends object>(tool: string, args: Record<string, unknown> = {}): Promise<T> => {
    const result = await call<unknown>(tool, args);
    if (result === null || typeof result !== "object") {
      throw new Error(`Amplenote returned an unexpected response for ${tool}.`);
    }
    return result as T;
  };
  // Name lookups see every note; lists and search results hide plugin notes.
  const allNotesFrom = async (tool: string, args: Record<string, unknown>) =>
    (await read<{ notes: Note[] }>(tool, args)).notes;
  const notesFrom = async (tool: string, args: Record<string, unknown>) =>
    withoutPluginNotes(await allNotesFrom(tool, args));
  const pendingJots = new Map<string, Promise<Note>>();
  const api = {
    listNotes: async (sortOrder: NoteSortOrder = "opened") => notesFrom("filterNotes", { sortOrder }),

    searchNotes: async (query: string) => notesFrom("searchNotes", { query }),

    getTags: async () => (await read<{ tags: Tag[] }>("getTags")).tags.filter((tag) => !isPluginTag(tag.text)),

    /** null when Amplenote has no readable content, for example for locked Vault notes. */
    getNoteContent: async (noteUUID: string) =>
      (await read<{ markdown: string | null }>("getNoteContent", { noteUUID })).markdown,

    getNoteMetadata: async (noteUUID: string) =>
      (await read<{ note: Note | null }>("getNoteMetadata", { noteUUID })).note,

    getTask: async (taskUUID: string) => (await read<{ task: Task | null }>("getTask", { taskUUID })).task,

    getNoteTasks: async (noteUUID: string, includeDone = false) =>
      (await read<{ tasks: Task[] }>("getNoteTasks", { noteUUID, includeDone })).tasks,

    getNoteBacklinks: async (noteUUID: string) => notesFrom("getNoteBacklinks", { noteUUID }),

    getNoteOpenCounts: async (noteUUID: string) =>
      (
        await read<{ openCounts: { week: number; month: number; quarter: number } | null }>("getNoteOpenCounts", {
          noteUUID,
        })
      ).openCounts,

    getCompletedTasks: async (from: number) => (await read<{ tasks: Task[] }>("getCompletedTasks", { from })).tasks,

    listOpenTasks: async () => {
      const domains = await api.getTaskDomains();
      const results = await Promise.all(
        domains.map(async (domain) => ({ domain, tasks: await api.getTaskDomainTasks(domain.uuid) })),
      );
      const byUUID = new Map<string, DomainTask>();
      for (const { domain, tasks } of results) {
        for (const task of tasks) {
          const existing = byUUID.get(task.uuid);
          if (existing) existing.domainUUIDs.push(domain.uuid);
          else byUUID.set(task.uuid, { ...task, domainUUIDs: [domain.uuid] });
        }
      }
      return { domains, tasks: [...byUUID.values()] };
    },

    /** Runs every step and returns the ones that failed, so callers can retry only those. */
    applyNoteSteps: async (noteUUID: string, steps: NoteStep[]): Promise<NoteStep[]> => {
      const failed: NoteStep[] = [];
      for (const step of steps) {
        const run =
          step.kind === "content"
            ? api.insertNoteContent(noteUUID, step.markdown)
            : api.addNoteToTaskDomain(noteUUID, step.taskDomainUUID);
        await run.catch(() => failed.push(step));
      }
      return failed;
    },

    addNoteToTaskDomain: (noteUUID: string, taskDomainUUID: string) =>
      call("addTaskDomainNote", { noteUUID, taskDomainUUID }),

    getTaskDomains: async () => (await read<{ taskDomains: TaskDomain[] }>("getTaskDomains")).taskDomains,

    getTaskDomainTasks: async (taskDomainUUID: string) =>
      (await read<{ tasks: Task[] }>("getTaskDomainTasks", { taskDomainUUID })).tasks,

    updateTask: (taskUUID: string, updates: Partial<Omit<Task, "uuid">>) =>
      call<{ success: boolean }>("updateTask", { taskUUID, updates }),

    completeTask: (taskUUID: string) => api.updateTask(taskUUID, { completedAt: nowSeconds() }),

    dismissTask: (taskUUID: string) => api.updateTask(taskUUID, { dismissedAt: nowSeconds() }),

    reopenTask: (taskUUID: string) => api.updateTask(taskUUID, { completedAt: 0, dismissedAt: 0 }),

    // New notes start with a temporary "local-" id until Amplenote has saved them. The temporary id works for
    // links and later calls; this returns the permanent one when it is already available.
    createNote: async (name: string, tags: string[] = []) => {
      const { noteUUID } = await read<{ noteUUID: string }>("createNote", { name, tags });
      if (!isTemporaryId(noteUUID)) return noteUUID;
      const note = await api.getNoteMetadata(noteUUID).catch(() => null);
      return note?.uuid ?? noteUUID;
    },

    /** Polls until Amplenote has saved a new note and reports its permanent id, or gives up after timeoutMs. */
    waitForPermanentId: async (noteUUID: string, { timeoutMs = 3000, intervalMs = 100 } = {}) => {
      const deadline = Date.now() + timeoutMs;
      let current = noteUUID;
      while (isTemporaryId(current) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        current = (await api.getNoteMetadata(noteUUID).catch(() => null))?.uuid ?? current;
      }
      return current;
    },

    insertNoteContent: (noteUUID: string, markdownContent: string, atEnd = true) =>
      call("insertNoteContent", { noteUUID, markdownContent, atEnd }),

    insertTask: async (noteUUID: string, task: NewTask) =>
      (
        await read<{ taskUUID: string }>("insertTask", {
          noteUUID,
          task: {
            uuid: randomUUID(),
            noteUUID,
            content: task.content,
            startAt: task.startAt ?? null,
            deadline: task.deadline ?? null,
            hideUntil: task.hideUntil ?? null,
            important: task.important ?? false,
            urgent: task.urgent ?? false,
            isRepeating: !!task.repeat,
            ...(task.repeat ? { repeat: task.repeat } : {}),
          },
        })
      ).taskUUID,

    findNoteByName: async (name: string) =>
      matchNoteByName(await allNotesFrom("filterNotes", { query: name.trim() }), name),

    findDailyJot: async (date = new Date()): Promise<Note | undefined> => {
      const name = dailyJotName(date);
      const notes = await allNotesFrom("filterNotes", { query: name });
      return notes.find((note) => note.name === name && note.tags.includes(dailyJotTag));
    },

    findOrCreateDailyJot: (date = new Date()): Promise<Note> => {
      const name = dailyJotName(date);
      const key = `${dailyJotTag}:${name}`;
      const pending = pendingJots.get(key);
      if (pending) return pending;
      const lookup = (async () => {
        const existing = await api.findDailyJot(date);
        if (existing) return existing;
        const uuid = await api.createNote(name, [dailyJotTag]);
        return { uuid, name, tags: [dailyJotTag] };
      })();
      pendingJots.set(key, lookup);
      return lookup.finally(() => pendingJots.delete(key));
    },
  };
  return api;
}

export type AmplenoteApi = ReturnType<typeof createApi>;

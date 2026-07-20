export type Priority =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

export type Task = {
  raw: string;
  completed: boolean;
  completionDate?: string;
  priority?: Priority;
  creationDate?: string;
  description: string;
  projects: string[];
  contexts: string[];
  metadata: Record<string, string>;
  lineNumber: number;
};

const PRIORITY_RE = /^\(([A-Z])\)\s+/;
const COMPLETED_RE = /^x\s+/;
const DATE_RE = /^(\d{4}-\d{2}-\d{2})\s+/;

export function parseLine(line: string, lineNumber: number): Task {
  let rest = line;

  let completed = false;
  if (COMPLETED_RE.test(rest)) {
    completed = true;
    rest = rest.replace(COMPLETED_RE, "");
  }

  let completionDate: string | undefined;
  if (completed) {
    const m = rest.match(DATE_RE);
    if (m) {
      completionDate = m[1];
      rest = rest.slice(m[0].length);
    }
  }

  let priority: Priority | undefined;
  const prioMatch = rest.match(PRIORITY_RE);
  if (prioMatch) {
    priority = prioMatch[1] as Priority;
    rest = rest.slice(prioMatch[0].length);
  }

  let creationDate: string | undefined;
  const createMatch = rest.match(DATE_RE);
  if (createMatch) {
    creationDate = createMatch[1];
    rest = rest.slice(createMatch[0].length);
  }

  const tags = extractTags(rest);

  return {
    raw: line,
    completed,
    completionDate,
    priority,
    creationDate,
    description: rest,
    projects: tags.projects,
    contexts: tags.contexts,
    metadata: tags.metadata,
    lineNumber,
  };
}

export function extractTags(description: string): {
  projects: string[];
  contexts: string[];
  metadata: Record<string, string>;
} {
  const projects: string[] = [];
  const contexts: string[] = [];
  const metadata: Record<string, string> = {};

  const tokens = description.split(/\s+/);

  for (const tok of tokens) {
    if (tok.startsWith("+") && tok.length > 1) {
      projects.push(tok.slice(1));
    } else if (tok.startsWith("@") && tok.length > 1) {
      contexts.push(tok.slice(1));
    } else if (/^[^:\s]+:[^:\s]+$/.test(tok)) {
      const idx = tok.indexOf(":");
      const key = tok.slice(0, idx);
      const value = tok.slice(idx + 1);
      metadata[key] = value;
    }
  }

  return { projects, contexts, metadata };
}

export function stripMetadataFromDescription(description: string): string {
  if (description.length === 0) return "";
  const tokens = description.split(/\s+/);
  const kept = tokens.filter((tok) => !/^[^:\s]+:[^:\s]+$/.test(tok));
  return kept.join(" ").trim();
}

export function stripTagsFromDescription(description: string): string {
  if (description.length === 0) return "";
  const tokens = description.split(/\s+/);
  const kept = tokens.filter((tok) => {
    if (tok.startsWith("+") && tok.length > 1) return false;
    if (tok.startsWith("@") && tok.length > 1) return false;
    if (/^[^:\s]+:[^:\s]+$/.test(tok)) return false;
    return true;
  });
  return kept.join(" ").trim();
}

export function serializeTask(task: Task): string {
  const parts: string[] = [];

  if (task.completed) {
    parts.push("x");
    if (task.completionDate) parts.push(task.completionDate);
  }

  // Per the todo.txt spec, completing a task removes its priority. The parser still
  // accepts `(A)` on a completed line (some legacy/non-conformant files have it), but
  // we never emit it when serializing.
  if (!task.completed && task.priority) parts.push(`(${task.priority})`);
  if (task.creationDate) parts.push(task.creationDate);

  if (task.description.length > 0) parts.push(task.description);

  return parts.join(" ");
}

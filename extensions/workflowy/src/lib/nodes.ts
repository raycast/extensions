export type CapturePosition = "top" | "bottom";
export type CaptureType = "bullet" | "todo";

export interface WorkflowyNodeRecord {
  id: string;
  name: string;
  note: string | null;
  path: string;
  parentId: string | null;
  completed: number;
  priority: number;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface WorkflowyExportNode {
  id: string;
  nm?: string;
  no?: string;
  cp?: number;
  lm?: number;
  ct?: number;
  pr?: number;
  ch?: WorkflowyExportNode[];
  name?: string;
  note?: string | null;
  parent_id?: string | null;
  priority?: number;
  completed?: boolean;
  completedAt?: number | null;
  createdAt?: number | null;
  modifiedAt?: number | null;
}

export interface FlattenedNode {
  id: string;
  name: string;
  note: string | null;
  path: string;
  parentId: string | null;
  completed: number;
  priority: number;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface WorkflowyShortcut {
  name: string;
  nodeId: string | null;
  isSystem: boolean;
  label: string;
}

export interface WorkflowyApiNode {
  id: string;
  name: string;
  note: string | null;
  priority: number;
  data?: { layoutMode?: string };
  createdAt: number | null;
  modifiedAt: number | null;
  completedAt: number | null;
}

export interface Bookmark {
  name: string;
  nodeId: string;
  note: string | null;
  createdAt: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface WorkflowyWriteOperation {
  op: "insert" | "update" | "complete" | "uncomplete" | "move" | "delete";
  parentId?: string;
  id?: string;
  text?: string;
  note?: string;
  position?: CapturePosition;
  type?: CaptureType;
}

export interface SyncProgressEvent {
  type: "progress" | "done" | "error" | "rate-limit";
  message?: string;
  step?: string;
  nodeCount?: number;
  remainingSeconds?: number;
}

export const SYSTEM_TARGETS = ["inbox", "today", "tomorrow", "next_week"] as const;

export type SystemTarget = (typeof SYSTEM_TARGETS)[number];

export function isFullUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function extractTags(input: string): string[] {
  const matches = input.match(/#[\w-]+|@[\w-]+/g) ?? [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
}

export function sanitizeShortcutLabel(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string | null | undefined, length = 80): string {
  if (!text) return "";
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

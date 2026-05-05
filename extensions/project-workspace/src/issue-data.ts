import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

import { DEFAULT_LABELS, Issue, IssueLabel, IssuePriority, IssueStatus } from "./issue-types";

const ISSUES_FILE = path.join(environment.supportPath, "issues.json");
const LABELS_FILE = path.join(environment.supportPath, "labels.json");

function ensureSupportDir(): void {
  if (!fs.existsSync(environment.supportPath)) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  }
}

export function loadIssues(): Issue[] {
  ensureSupportDir();
  if (!fs.existsSync(ISSUES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ISSUES_FILE, "utf-8")) as Issue[];
  } catch {
    return [];
  }
}

function saveIssues(issues: Issue[]): void {
  ensureSupportDir();
  fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2), "utf-8");
}

export function loadLabels(): IssueLabel[] {
  ensureSupportDir();
  if (!fs.existsSync(LABELS_FILE)) {
    saveLabels(DEFAULT_LABELS);
    return [...DEFAULT_LABELS];
  }
  try {
    const labels = JSON.parse(fs.readFileSync(LABELS_FILE, "utf-8")) as IssueLabel[];
    return labels.length > 0 ? labels : [...DEFAULT_LABELS];
  } catch {
    return [...DEFAULT_LABELS];
  }
}

export function saveLabels(labels: IssueLabel[]): void {
  ensureSupportDir();
  fs.writeFileSync(LABELS_FILE, JSON.stringify(labels, null, 2), "utf-8");
}

export function createIssue(fields: {
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  projectPath?: string;
  completedAt?: string;
}): Issue {
  const issues = loadIssues();
  const validSeqs = issues
    .map((i) => i.seq)
    .filter((seq) => typeof seq === "number" && Number.isInteger(seq) && seq > 0);
  const seq = validSeqs.length > 0 ? Math.max(...validSeqs) + 1 : 1;
  const now = new Date().toISOString();
  const issue: Issue = {
    id: `ISS-${String(seq).padStart(3, "0")}`,
    seq,
    title: fields.title,
    description: fields.description,
    status: fields.status,
    priority: fields.priority,
    labels: fields.labels,
    projectPath: fields.projectPath,
    completedAt: fields.completedAt ?? (fields.status === "done" ? now : undefined),
    createdAt: now,
    updatedAt: now,
  };
  saveIssues([...issues, issue]);
  return issue;
}

export function updateIssue(id: string, fields: Partial<Omit<Issue, "id" | "seq" | "createdAt">>): Issue | null {
  const issues = loadIssues();
  const index = issues.findIndex((i) => i.id === id);
  if (index === -1) return null;
  const existing = issues[index];
  const now = new Date().toISOString();

  // Auto-manage completedAt unless the caller explicitly provides it
  let completedAt = "completedAt" in fields ? fields.completedAt : existing.completedAt;
  if (!("completedAt" in fields)) {
    const newStatus = fields.status ?? existing.status;
    if (newStatus === "done" && !existing.completedAt) {
      completedAt = now;
    } else if (newStatus !== "done" && newStatus !== existing.status) {
      completedAt = undefined;
    }
  }

  const updated: Issue = { ...existing, ...fields, completedAt, updatedAt: now };
  issues[index] = updated;
  saveIssues(issues);
  return updated;
}

export function deleteIssue(id: string): boolean {
  const issues = loadIssues();
  const filtered = issues.filter((i) => i.id !== id);
  if (filtered.length === issues.length) return false;
  saveIssues(filtered);
  return true;
}

export function createLabel(name: string, color: string): IssueLabel {
  const labels = loadLabels();
  const label: IssueLabel = { name: name.trim(), color };
  saveLabels([...labels, label]);
  return label;
}

export function deleteLabel(name: string): void {
  const labels = loadLabels();
  saveLabels(labels.filter((l) => l.name !== name));
}

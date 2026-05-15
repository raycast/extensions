import type { CreateIssueParams } from "../api/issues";
import type { Label } from "../types/api";

export type CreateIssueFormValues = {
  repository: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;
  dueDate?: string;
  [key: string]: unknown;
};

export type GroupedLabels = {
  regular: Label[];
  exclusive: Record<string, Label[]>;
};

export function parseRepo(fullName?: string) {
  if (!fullName) return { owner: undefined, repo: undefined };
  const [owner, repo] = fullName.split("/");
  return { owner, repo };
}

export function groupLabels(labels: Label[]): GroupedLabels {
  return labels.reduce<GroupedLabels>(
    (accumulator, label) => {
      if (label.exclusive) {
        const prefix = label.name?.split("/")[0] || "";
        accumulator.exclusive[prefix] = [...(accumulator.exclusive[prefix] || []), label];
      } else {
        accumulator.regular.push(label);
      }
      return accumulator;
    },
    { regular: [], exclusive: {} },
  );
}

export function buildCreateIssueParams(values: CreateIssueFormValues): CreateIssueParams | null {
  if (!values.repository || !values.title?.trim()) {
    return null;
  }

  const { owner, repo } = parseRepo(values.repository);
  if (!owner || !repo) {
    return null;
  }

  const regularLabels = (values.labels ?? []).map((value) => parseInt(value, 10)).filter(Number.isFinite);
  const exclusiveLabels = Object.keys(values)
    .filter((key) => key.startsWith("label."))
    .map((key) => values[key])
    .filter(Boolean)
    .map((value) => parseInt(value as string, 10))
    .filter(Number.isFinite);
  const labels = [...regularLabels, ...exclusiveLabels];

  const assignees = (values.assignees ?? []).map((value) => value.trim()).filter(Boolean);
  const milestone = values.milestone ? parseInt(values.milestone, 10) : undefined;
  const due_date = values.dueDate ? new Date(values.dueDate).toISOString() : undefined;

  return {
    owner,
    repo,
    title: values.title.trim(),
    body: values.body?.trim() || undefined,
    labels: labels.length > 0 ? labels : undefined,
    milestone: Number.isFinite(milestone) ? milestone : undefined,
    assignees: assignees.length > 0 ? assignees : undefined,
    due_date,
  };
}

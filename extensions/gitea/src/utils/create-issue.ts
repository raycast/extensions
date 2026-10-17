import type { CreateIssueParams } from "../api/issues";
import type { Label } from "../types/api";

type ExclusiveLabelField = `label.${string}`;

type BaseCreateIssueFormValues = {
  repository: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;
  dueDate?: string;
};

export type CreateIssueFormValues = BaseCreateIssueFormValues & Partial<Record<ExclusiveLabelField, string>>;

export type CreateIssueFormError = {
  error: string;
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

export function buildCreateIssueParams(values: CreateIssueFormValues): CreateIssueParams | CreateIssueFormError {
  if (!values.repository) {
    return { error: "Repository is required" };
  }

  if (!values.title?.trim()) {
    return { error: "Title is required" };
  }

  const { owner, repo } = parseRepo(values.repository);
  if (!owner || !repo) {
    return { error: "Invalid repository format" };
  }

  const title = values.title.trim();
  if (title.length > 255) {
    return { error: "Title must be 255 characters or less" };
  }

  const regularLabels = (values.labels ?? []).map((value) => parseInt(value, 10)).filter(Number.isFinite);
  const exclusiveLabels = Object.keys(values)
    .filter((key): key is ExclusiveLabelField => key.startsWith("label."))
    .map((key) => values[key])
    .filter((value): value is string => Boolean(value))
    .map((value) => parseInt(value, 10))
    .filter(Number.isFinite);
  const labels = [...regularLabels, ...exclusiveLabels];

  const assignees = (values.assignees ?? []).map((value) => value.trim()).filter(Boolean);
  const milestone = values.milestone ? parseInt(values.milestone, 10) : undefined;
  const due_date = values.dueDate ? new Date(values.dueDate).toISOString() : undefined;

  return {
    owner,
    repo,
    title,
    body: values.body?.trim() || undefined,
    labels: labels.length > 0 ? labels : undefined,
    milestone: Number.isFinite(milestone) ? milestone : undefined,
    assignees: assignees.length > 0 ? assignees : undefined,
    due_date,
  };
}

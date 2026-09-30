import type { IssueTemplateResult } from "../api/getIssueTemplates";

type IssueTemplateData = Partial<{
  title: unknown;
  description: unknown;
  stateId: unknown;
  statusId: unknown;
  priority: unknown;
  assigneeId: unknown;
  labelIds: unknown;
  labels: unknown;
  estimate: unknown;
  dueDate: unknown;
  cycleId: unknown;
  projectId: unknown;
}>;

export type CreateIssueTemplateValues = {
  title: string;
  description: string;
  stateId: string;
  priority: string;
  assigneeId: string;
  labelIds: string[];
  estimate: string;
  dueDate: Date | null;
  cycleId: string;
  projectId: string;
  milestoneId: string;
};

export function getEmptyTemplateFieldValues(
  overrides: Partial<CreateIssueTemplateValues> = {},
): CreateIssueTemplateValues {
  return {
    title: "",
    description: "",
    stateId: "",
    priority: "",
    assigneeId: "",
    labelIds: [],
    estimate: "",
    dueDate: null,
    cycleId: "",
    projectId: "",
    milestoneId: "",
    ...overrides,
  };
}

function parseTemplateData(templateData: unknown): IssueTemplateData {
  if (typeof templateData === "string") {
    try {
      const parsed = JSON.parse(templateData);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof templateData === "object" && templateData !== null ? templateData : {};
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getStringFromNumber(value: unknown) {
  return typeof value === "number" ? String(value) : getString(value);
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((item): item is string => typeof item === "string");

  return strings.length > 0 ? strings : undefined;
}

function getDueDate(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getCreateIssueValuesFromTemplate(
  template: IssueTemplateResult,
  fallbackDefaults: Partial<CreateIssueTemplateValues> = {},
): CreateIssueTemplateValues {
  const data = parseTemplateData(template.templateData);
  const defaults = getEmptyTemplateFieldValues(fallbackDefaults);
  const labelIds = getStringArray(data.labelIds) ?? getStringArray(data.labels);

  return {
    title: getString(data.title) ?? defaults.title,
    description: getString(data.description) ?? defaults.description,
    stateId: getString(data.stateId) ?? getString(data.statusId) ?? defaults.stateId,
    priority: getStringFromNumber(data.priority) ?? defaults.priority,
    assigneeId: getString(data.assigneeId) ?? defaults.assigneeId,
    labelIds: labelIds ?? defaults.labelIds,
    estimate: getStringFromNumber(data.estimate) ?? defaults.estimate,
    dueDate: data.dueDate !== undefined ? (getDueDate(data.dueDate) ?? null) : defaults.dueDate,
    cycleId: getString(data.cycleId) ?? defaults.cycleId,
    projectId: getString(data.projectId) ?? defaults.projectId,
    milestoneId: defaults.milestoneId,
  };
}

const HEADER_PREVIEW_MAX_LENGTH = 54;

const BODY_PREVIEW_BUDGET_WITHOUT_ACCESSORIES = 150;
const BODY_PREVIEW_BUDGET_WITH_ACCESSORIES = 80;

export interface TaskListDisplayText {
  title: string;
  subtitle?: string;
}

export function buildTaskListDisplayText(header: string, body: string, accessoryCount = 0): TaskListDisplayText {
  const title = truncatePreview(normalizePreviewText(header), HEADER_PREVIEW_MAX_LENGTH);
  const normalizedBody = normalizePreviewText(body);

  if (!normalizedBody) {
    return { title };
  }

  const bodyBudget = getBodyPreviewBudget(accessoryCount);
  const bodyMaxLength = Math.max(0, bodyBudget - title.length);

  return {
    title,
    subtitle: truncatePreview(normalizedBody, bodyMaxLength),
  };
}

function getBodyPreviewBudget(accessoryCount: number): number {
  return accessoryCount > 0 ? BODY_PREVIEW_BUDGET_WITH_ACCESSORIES : BODY_PREVIEW_BUDGET_WITHOUT_ACCESSORIES;
}

function normalizePreviewText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncatePreview(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 1) {
    return "…";
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

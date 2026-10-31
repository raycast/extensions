import type { ExtensionPreferences, NormalizedTask, ResolvedView } from "./types";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";
const MAX_TASKS = 200;
const TASKS_PAGE_SIZE = 100;

type ClickUpTaskStatus = {
  color?: unknown;
  name?: unknown;
  status?: unknown;
  type?: unknown;
};

type ClickUpTaskRecord = {
  archived?: unknown;
  custom_fields?: unknown;
  date_closed?: unknown;
  due_date?: unknown;
  folder?: {
    name?: unknown;
  };
  id?: unknown;
  list?: {
    name?: unknown;
  };
  name?: unknown;
  status?: ClickUpTaskStatus;
  url?: unknown;
};

type ClickUpTaskPage = {
  tasks?: unknown;
};

type ClickUpViewRecord = {
  id?: unknown;
  name?: unknown;
  public?: unknown;
  type?: unknown;
  url?: unknown;
  visibility?: unknown;
};

type ClickUpViewCollection = {
  required_views?: unknown;
  views?: unknown;
};

type ClickUpGetViewResponse = ClickUpViewRecord & {
  view?: ClickUpViewRecord | null;
};

type FetchViewTasksResult = {
  tasks: NormalizedTask[];
  view: ResolvedView;
};

class ClickUpApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ClickUpApiError";
  }
}

export async function fetchViewTasks(preferences: ExtensionPreferences): Promise<FetchViewTasksResult> {
  const token = preferences.clickupApiToken.trim();
  const teamId = preferences.teamId.trim();
  const view = await resolveView(token, teamId, preferences.viewIdOrUrl);
  const normalizedTasks = new Map<string, NormalizedTask>();

  for (let page = 0; normalizedTasks.size < MAX_TASKS; page += 1) {
    const response = await clickUpRequest<ClickUpTaskPage>(
      token,
      `/view/${encodeURIComponent(view.id)}/task?page=${page}`,
    );
    const pageTasks = extractTasks(response);

    if (pageTasks.length === 0) {
      break;
    }

    for (const task of pageTasks) {
      const normalizedTask = normalizeTask(task);

      if (normalizedTask) {
        normalizedTasks.set(normalizedTask.id, normalizedTask);
      }

      if (normalizedTasks.size >= MAX_TASKS) {
        break;
      }
    }

    if (pageTasks.length < TASKS_PAGE_SIZE) {
      break;
    }
  }

  const tasks = Array.from(normalizedTasks.values());
  const filteredTasks = preferences.showClosedTasks ? tasks : tasks.filter((task) => !task.isClosed);

  return {
    tasks: filteredTasks,
    view: {
      ...view,
      url: looksLikeUrl(preferences.viewIdOrUrl.trim()) ? preferences.viewIdOrUrl.trim() : view.url,
    },
  };
}

async function resolveView(token: string, teamId: string, viewIdOrUrl: string): Promise<ResolvedView> {
  const trimmedInput = viewIdOrUrl.trim();
  const candidateIds = extractViewIdCandidates(trimmedInput);

  for (const candidateId of candidateIds) {
    try {
      return await fetchView(token, teamId, candidateId);
    } catch (error) {
      if (!(error instanceof ClickUpApiError) || error.status !== 404) {
        throw error;
      }
    }
  }

  const workspaceViews = await fetchWorkspaceViews(token, teamId);
  const normalizedInput = trimmedInput.toLowerCase();
  const candidateIdSet = new Set(candidateIds.map((value) => value.toLowerCase()));

  const matchedView = workspaceViews.find((view) => {
    const viewId = asNonEmptyString(view.id)?.toLowerCase();
    const viewName = asNonEmptyString(view.name)?.toLowerCase();

    return viewId === normalizedInput || (viewId ? candidateIdSet.has(viewId) : false) || viewName === normalizedInput;
  });

  if (!matchedView) {
    const extractedCandidates = candidateIds.length > 0 ? ` Extracted from input: ${candidateIds.join(", ")}.` : "";
    throw new Error(
      "Could not resolve the configured ClickUp view. Use a view ID, a view URL, or the exact name of an Everything-level workspace view." +
        extractedCandidates,
    );
  }

  const matchedId = asNonEmptyString(matchedView.id);

  if (!matchedId) {
    throw new Error("ClickUp returned a view without an ID.");
  }

  return {
    id: matchedId,
    name: asNonEmptyString(matchedView.name),
    url: getViewUrl(matchedView, teamId),
  };
}

async function fetchView(token: string, teamId: string, viewId: string): Promise<ResolvedView> {
  const response = await clickUpRequest<ClickUpGetViewResponse>(token, `/view/${encodeURIComponent(viewId)}`);
  const normalizedView = extractViewRecord(response);
  const id = asNonEmptyString(normalizedView.id);

  if (!id) {
    const availableKeys = Object.keys(normalizedView).sort();
    throw new Error(
      `ClickUp returned a view payload without an ID for "${viewId}". Response keys: ${availableKeys.join(", ") || "(none)"}.`,
    );
  }

  return {
    id,
    name: asNonEmptyString(normalizedView.name),
    url: getViewUrl(normalizedView, teamId),
  };
}

function getViewUrl(view: ClickUpViewRecord, teamId: string): string | undefined {
  const providedUrl = asNonEmptyString(view.url);

  if (providedUrl && looksLikeUrl(providedUrl)) {
    return providedUrl;
  }

  const id = asNonEmptyString(view.id);
  const viewType = asNonEmptyString(view.type)?.toLowerCase();
  const viewPaths: Record<string, string> = {
    board: "b",
    calendar: "c",
    form: "fm",
    gantt: "g",
    grid: "gr",
    list: "l",
    map: "m",
    mindmap: "mm",
    table: "gr",
    timeline: "tl",
  };
  const viewPath = viewType ? viewPaths[viewType] : undefined;

  return id && viewPath
    ? `https://app.clickup.com/${encodeURIComponent(teamId)}/v/${viewPath}/${encodeURIComponent(id)}`
    : undefined;
}

async function fetchWorkspaceViews(token: string, teamId: string): Promise<ClickUpViewRecord[]> {
  const response = await clickUpRequest<ClickUpViewCollection>(token, `/team/${encodeURIComponent(teamId)}/view`);
  const views: ClickUpViewRecord[] = [];

  if (Array.isArray(response.views)) {
    views.push(...(response.views as ClickUpViewRecord[]));
  }

  if (Array.isArray(response.required_views)) {
    views.push(...(response.required_views as ClickUpViewRecord[]));
  }

  return views;
}

async function clickUpRequest<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${CLICKUP_API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  });

  if (!response.ok) {
    throw new ClickUpApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function getErrorMessage(response: Response): Promise<string> {
  if (response.status === 401) {
    return "ClickUp rejected the API token.";
  }

  if (response.status === 403) {
    return "This token does not have access to the configured workspace or view.";
  }

  if (response.status === 404) {
    return "The configured ClickUp view could not be found.";
  }

  if (response.status === 429) {
    return "ClickUp rate limit reached. Try refreshing again in a minute.";
  }

  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const message =
      asNonEmptyString(payload.err) ??
      asNonEmptyString(payload.error) ??
      asNonEmptyString(payload.message) ??
      `ClickUp request failed with status ${response.status}.`;

    return message;
  } catch {
    return `ClickUp request failed with status ${response.status}.`;
  }
}

function extractTasks(response: ClickUpTaskPage): ClickUpTaskRecord[] {
  if (Array.isArray(response.tasks)) {
    return response.tasks as ClickUpTaskRecord[];
  }

  return [];
}

function normalizeTask(task: ClickUpTaskRecord): NormalizedTask | undefined {
  const id = asNonEmptyString(task.id);
  const name = asNonEmptyString(task.name);

  if (!id || !name) {
    return undefined;
  }

  const statusName = asNonEmptyString(task.status?.status) ?? asNonEmptyString(task.status?.name) ?? "Unknown Status";
  const statusColor = normalizeColor(task.status?.color);
  const statusType = asNonEmptyString(task.status?.type);
  const folderName = asNonEmptyString(task.folder?.name);
  const partnerName = getPartnerName(task.custom_fields);

  return {
    dueDateMs: parseTimestamp(task.due_date),
    folderName,
    id,
    listName: asNonEmptyString(task.list?.name),
    name,
    partnerName,
    statusColor,
    statusName,
    statusType,
    url: getTaskUrl(id, task.url),
    isClosed: isClosedTask(task),
  };
}

function isClosedTask(task: ClickUpTaskRecord): boolean {
  const statusType = asNonEmptyString(task.status?.type)?.toLowerCase();

  if (statusType === "closed" || statusType === "done") {
    return true;
  }

  if (typeof task.archived === "boolean" && task.archived) {
    return true;
  }

  return typeof task.date_closed === "string" && task.date_closed.length > 0;
}

function getTaskUrl(taskId: string, taskUrl: unknown): string {
  const providedUrl = asNonEmptyString(taskUrl);

  if (providedUrl) {
    try {
      const parsedUrl = new URL(providedUrl);

      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return providedUrl;
      }
    } catch {
      // Fall back to a constructed task URL below.
    }
  }

  return `https://app.clickup.com/t/${encodeURIComponent(taskId)}`;
}

function extractViewIdCandidates(input: string): string[] {
  const candidates = new Set<string>();

  if (!input) {
    return [];
  }

  if (looksLikeUrl(input)) {
    try {
      const url = new URL(input);
      const pathSegments = url.pathname.split("/").filter(Boolean);

      addCandidateVariants(candidates, url.searchParams.get("view"));
      addCandidateVariants(candidates, url.searchParams.get("view_id"));
      addCandidateVariants(candidates, pathSegments.at(-1));

      for (let index = 0; index < pathSegments.length; index += 1) {
        const segment = pathSegments[index];

        if ((segment === "v" || segment === "view") && index < pathSegments.length - 1) {
          for (const candidateSegment of pathSegments.slice(index + 1).reverse()) {
            addCandidateVariants(candidates, candidateSegment);
          }
        }
      }
    } catch {
      // Ignore URL parsing failures and use the raw input plus fallback resolution.
    }
  } else {
    addCandidateVariants(candidates, input);
  }

  return Array.from(candidates);
}

function addCandidateVariants(values: Set<string>, candidate: string | null | undefined): void {
  if (!candidate) {
    return;
  }

  const trimmedCandidate = candidate.trim();

  if (trimmedCandidate.length === 0) {
    return;
  }

  values.add(trimmedCandidate);

  if (trimmedCandidate.includes("-")) {
    for (const candidatePart of trimmedCandidate.split("-")) {
      const trimmedPart = candidatePart.trim();

      if (trimmedPart.length > 0) {
        values.add(trimmedPart);
      }
    }
  }

  const numericMatch = trimmedCandidate.match(/^\d+-([A-Za-z0-9]+)-\d+$/);
  if (numericMatch?.[1]) {
    values.add(numericMatch[1]);
  }
}

function extractViewRecord(response: ClickUpGetViewResponse): ClickUpViewRecord {
  if (response.view && typeof response.view === "object") {
    return response.view;
  }

  return response;
}

function looksLikeUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function getPartnerName(customFields: unknown): string | undefined {
  if (!Array.isArray(customFields)) {
    return undefined;
  }

  for (const field of customFields) {
    if (!field || typeof field !== "object") {
      continue;
    }

    const candidateField = field as {
      name?: unknown;
      type_config?: { options?: unknown };
      value?: unknown;
    };

    if (asNonEmptyString(candidateField.name)?.toLowerCase() !== "partner") {
      continue;
    }

    const directValue = readCustomFieldValue(candidateField.value);

    if (directValue) {
      return directValue;
    }

    if (candidateField.type_config && typeof candidateField.type_config === "object") {
      const options = Array.isArray(candidateField.type_config.options) ? candidateField.type_config.options : [];
      const value = candidateField.value;

      if (typeof value === "number") {
        const matchingOption = options.find((option, index) => {
          if (!option || typeof option !== "object") {
            return false;
          }

          const candidateOption = option as { orderindex?: unknown };
          const orderIndex = Number.parseInt(asNonEmptyString(candidateOption.orderindex) ?? "", 10);

          return index === value || orderIndex === value;
        });

        if (matchingOption && typeof matchingOption === "object") {
          const optionName = asNonEmptyString((matchingOption as { name?: unknown }).name);

          if (optionName) {
            return optionName;
          }
        }
      }
    }
  }

  return undefined;
}

function readCustomFieldValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return asNonEmptyString(value);
  }

  if (Array.isArray(value)) {
    const names = value
      .map((item) => {
        if (item && typeof item === "object") {
          return asNonEmptyString((item as { name?: unknown }).name);
        }

        return undefined;
      })
      .filter((item): item is string => Boolean(item));

    return names.length > 0 ? names.join(", ") : undefined;
  }

  if (value && typeof value === "object") {
    return asNonEmptyString((value as { name?: unknown }).name);
  }

  return undefined;
}

function parseTimestamp(value: unknown): number | undefined {
  const timestamp = Number.parseInt(asNonEmptyString(value) ?? "", 10);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function normalizeColor(value: unknown): string | undefined {
  const color = asNonEmptyString(value);

  if (!color) {
    return undefined;
  }

  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

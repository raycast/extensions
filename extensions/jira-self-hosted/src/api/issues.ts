import fs from "fs";

import { format } from "date-fns";
import FormData from "form-data";

import { IssueFormValues } from "../components/CreateIssueForm";
import { CustomFieldSchema, getCustomFieldValue } from "../helpers/issues";

import { Project } from "./projects";
import { autocomplete, getAuthenticatedUri, request } from "./request";
import { User } from "./users";

export type IssueType = {
  id: string;
  iconUrl: string;
  name: string;
  subtask: boolean;
};

export type Priority = { id: string; name: string; iconUrl: string; statusColor: string };

export async function getIssuePriorities() {
  return request<Priority[]>("/priority");
}

type CreateIssueParams = {
  customFields?: Record<string, CustomField>;
};

type CreateIssueResponse = {
  id: string;
  key: string;
};

export async function createIssue(values: IssueFormValues, { customFields }: CreateIssueParams) {
  const jsonValues: Record<string, unknown> = {
    summary: values.summary,
    issuetype: { id: values.issueTypeId },
    project: { id: values.projectId },
  };

  if (values.description) {
    // Jira Server/DC REST API v2 expects a plain string for description
    jsonValues.description = values.description;
  }

  if (values.parent) {
    jsonValues.parent = {
      key: values.parent,
    };
  }

  if (values.assigneeId) {
    jsonValues.assignee = { name: values.assigneeId };
  }

  if (values.priorityId) {
    jsonValues.priority = { id: values.priorityId };
  }

  if (values.labels && values.labels.length > 0) {
    jsonValues.labels = values.labels;
  }

  if (values.components && values.components.length > 0) {
    jsonValues.components = values.components.map((component) => {
      return { id: component };
    });
  }

  if (values.fixVersions && values.fixVersions.length > 0) {
    jsonValues.fixVersions = values.fixVersions.map((component) => {
      return { id: component };
    });
  }

  if (values.dueDate) {
    jsonValues.duedate = format(values.dueDate, "yyyy-MM-dd");
  }

  if (customFields) {
    Object.entries(values).forEach(([key, value]) => {
      // TODO: add prefix
      if (key.startsWith("customfield_") && value) {
        const fieldSchema = customFields[key].schema.custom as CustomFieldSchema;
        jsonValues[key] = getCustomFieldValue(fieldSchema, value);
      }
    });
  }

  const body = {
    update: {},
    fields: jsonValues,
  };

  return request<CreateIssueResponse>("/issue", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export enum StatusCategoryKey {
  indeterminate = "indeterminate",
  new = "new",
  done = "done",
  unknown = "unknown",
}

type IssueStatus = {
  id: string;
  name: string;
  statusCategory?: {
    id: string;
    key: StatusCategoryKey;
    name: string;
    colorName: string;
  };
};

type IssueWatches = {
  isWatching: boolean;
};

/** Sprint as returned on issues (may be one or many per ticket; search may omit `state`). */
export type IssueSprintField = {
  id: string;
  name?: string;
  state?: string;
};

export type Issue = {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: IssueType;
    priority: Priority | null;
    assignee: User | null;
    project: Project | null;
    updated: string;
    status: IssueStatus;
    watches: IssueWatches;
    subtasks?: Issue[];
    parent?: Issue;
    sprint?: IssueSprintField | IssueSprintField[] | null;
    closedSprints?: IssueSprintField[];
  };
};

const GREENHOPPER_SPRINT_SCHEMA = "com.pyxis.greenhopper.jira:gh-sprint";

type JiraFieldMetadata = {
  id: string;
  schema?: { custom?: string };
};

let sprintCustomFieldIdsPromise: Promise<string[]> | null = null;

/** All Sprint custom field keys on the site (some instances define more than one gh-sprint field). */
async function getGreenhopperSprintFieldIds(): Promise<string[]> {
  if (sprintCustomFieldIdsPromise === null) {
    sprintCustomFieldIdsPromise = (async () => {
      try {
        const fields = await request<JiraFieldMetadata[] | { values?: JiraFieldMetadata[] }>("/field");
        const list = Array.isArray(fields) ? fields : fields?.values;
        if (!Array.isArray(list)) {
          return [];
        }
        const ids = list
          .filter((f) => f.schema?.custom === GREENHOPPER_SPRINT_SCHEMA)
          .map((f) => f.id)
          .filter(Boolean);
        return [...new Set(ids)];
      } catch {
        return [];
      }
    })();
  }
  return sprintCustomFieldIdsPromise;
}

function collectParsedSprintObjects(value: unknown, bucket: unknown[]): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    try {
      collectParsedSprintObjects(JSON.parse(trimmed) as unknown, bucket);
    } catch {
      /* ignore non-JSON sprint lines */
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const el of value) {
      collectParsedSprintObjects(el, bucket);
    }
    return;
  }
  if (typeof value === "object") {
    bucket.push(value);
  }
}

function mergeIssueSprintFields(issue: Issue, sprintCustomFieldIds: string[]) {
  if (!issue?.fields) {
    return;
  }
  const f = issue.fields as unknown as Record<string, unknown>;
  const bucket: unknown[] = [];
  collectParsedSprintObjects(f.sprint, bucket);
  collectParsedSprintObjects(f.closedSprints, bucket);
  for (const fieldId of sprintCustomFieldIds) {
    if (fieldId === "sprint" || fieldId === "closedSprints") {
      continue;
    }
    collectParsedSprintObjects(f[fieldId], bucket);
  }

  const byId = new Map<string, IssueSprintField>();
  for (const obj of bucket) {
    if (!obj || typeof obj !== "object") {
      continue;
    }
    const rec = obj as Record<string, unknown>;
    if (rec.id === undefined || rec.id === null) {
      continue;
    }
    const id = String(rec.id);
    const name = typeof rec.name === "string" ? rec.name : undefined;
    const state = typeof rec.state === "string" ? rec.state : undefined;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, { id, name, state });
    } else {
      byId.set(id, {
        id,
        name: prev.name ?? name,
        state: prev.state ?? state,
      });
    }
  }

  const list = [...byId.values()];
  if (list.length === 0) {
    return;
  }
  f.sprint = list.length === 1 ? list[0] : list;
}

export const resolveIssueTypeIconUris = async (issuetype: IssueType) => {
  const resolvedIconUri = await getAuthenticatedUri(issuetype.iconUrl, "image/jpeg");
  issuetype.iconUrl = resolvedIconUri;

  return issuetype;
};

type GetIssuesResponse = {
  issues: Issue[];
};

async function resolveUserAvatars(...users: (User | null | undefined)[]) {
  await Promise.all(
    users.map(async (user) => {
      if (user?.avatarUrls?.["32x32"]) {
        user.avatarUrls["32x32"] = await getAuthenticatedUri(user.avatarUrls["32x32"], "image/jpeg");
      }
    }),
  );
}

const DEFAULT_SEARCH_FIELDS = [
  "summary",
  "updated",
  "issuetype",
  "status",
  "priority",
  "assignee",
  "project",
  "watches",
  "subtasks",
  "parent",
  "sprint",
  "closedSprints",
] as const;

async function buildSearchFieldsParam(): Promise<string> {
  const sprintCustomFieldIds = await getGreenhopperSprintFieldIds();
  const fields = [...DEFAULT_SEARCH_FIELDS, ...sprintCustomFieldIds];
  return [...new Set(fields)].join(",");
}

export async function getIssues({ jql } = { jql: "" }) {
  const fieldsParam = await buildSearchFieldsParam();
  const params = {
    fields: fieldsParam,
    startAt: "0",
    maxResults: "30",
    validateQuery: "warn",
    jql,
  };

  const result = await request<GetIssuesResponse>("/search", { params });

  if (!result?.issues) {
    return result?.issues;
  }

  const sprintCustomFieldIds = await getGreenhopperSprintFieldIds();
  for (const issue of result.issues) {
    try {
      mergeIssueSprintFields(issue, sprintCustomFieldIds);
    } catch {
      /* skip merge for malformed issues */
    }
  }

  const resolvedIssues = await Promise.all(
    result.issues.map(async (issue) => {
      issue.fields.issuetype.iconUrl = await getAuthenticatedUri(issue.fields.issuetype.iconUrl, "image/jpeg");
      if (issue.fields.assignee?.avatarUrls?.["32x32"]) {
        issue.fields.assignee.avatarUrls["32x32"] = await getAuthenticatedUri(
          issue.fields.assignee.avatarUrls["32x32"],
          "image/jpeg",
        );
      }
      return issue;
    }),
  );

  return resolvedIssues;
}

const AI_SEARCH_FIELDS = [
  "summary",
  "updated",
  "issuetype",
  "status",
  "priority",
  "assignee",
  "project",
  "parent",
] as const;

/** Narrow search for Raycast AI tools — smaller payload than {@link getIssues}. */
export async function getIssuesForAI({ jql } = { jql: "" }) {
  const params = {
    fields: [...AI_SEARCH_FIELDS].join(","),
    startAt: "0",
    maxResults: "50",
    validateQuery: "warn",
    jql,
  };

  const result = await request<GetIssuesResponse>("/search", { params });

  if (!result?.issues) {
    return result?.issues ?? [];
  }

  return Promise.all(
    result.issues.map(async (issue) => {
      issue.fields.issuetype.iconUrl = await getAuthenticatedUri(issue.fields.issuetype.iconUrl, "image/jpeg");
      if (issue.fields.assignee?.avatarUrls?.["32x32"]) {
        issue.fields.assignee.avatarUrls["32x32"] = await getAuthenticatedUri(
          issue.fields.assignee.avatarUrls["32x32"],
          "image/jpeg",
        );
      }
      return issue;
    }),
  );
}

export type Schema = {
  type: string;
  custom: string;
  customId: string;
};

export type CustomField = {
  required: boolean;
  schema: Schema;
  name: string;
  key: string;
  allowedValues: unknown[];
  autoCompleteUrl?: string;
  hasDefaultValue?: boolean;
  defaultValue?: unknown;
};

export type IssueTypeWithCustomFields = IssueType & {
  fields: Record<string, CustomField>;
};

type GranularCreateMetaIssueType = {
  id: string;
  name: string;
  iconUrl: string;
  subtask: boolean;
};

type PageOfGranularIssueTypes = {
  values?: GranularCreateMetaIssueType[];
};

type GranularFieldMeta = {
  required: boolean;
  schema: {
    type?: string;
    custom?: string;
    customId?: number | string;
    items?: string;
    system?: string;
  };
  name: string;
  fieldId?: string;
  key?: string;
  autoCompleteUrl?: string;
  hasDefaultValue?: boolean;
  allowedValues?: unknown[];
  defaultValue?: unknown;
};

type PageOfGranularFieldMeta = {
  values?: GranularFieldMeta[];
};

function normalizeFieldSchema(schema: GranularFieldMeta["schema"] | undefined): Schema {
  if (!schema || typeof schema !== "object") {
    return { type: "string", custom: "", customId: "" };
  }
  return {
    type: schema.type ?? "string",
    custom: schema.custom ?? "",
    customId: schema.customId != null ? String(schema.customId) : "",
  };
}

function granularFieldMetaToCustomField(meta: GranularFieldMeta, id: string): CustomField {
  return {
    required: meta.required,
    schema: normalizeFieldSchema(meta.schema),
    name: meta.name,
    key: meta.key ?? id,
    allowedValues: meta.allowedValues ?? [],
    autoCompleteUrl: meta.autoCompleteUrl,
    hasDefaultValue: meta.hasDefaultValue,
    defaultValue: meta.defaultValue,
  };
}

/**
 * Jira 9+ only: `GET /issue/createmeta/{project}/issuetypes` (monolithic `GET /issue/createmeta` was removed in Jira 9).
 */
export async function getCreateIssueMetadataSummary(projectId: string): Promise<IssueTypeWithCustomFields[]> {
  const encodedProject = encodeURIComponent(projectId);
  const page = await request<PageOfGranularIssueTypes>(`/issue/createmeta/${encodedProject}/issuetypes`, {
    params: { startAt: "0", maxResults: "100" },
  });

  return (page?.values ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    iconUrl: t.iconUrl,
    subtask: t.subtask,
    fields: {},
  }));
}

/**
 * Jira 9+ only: `GET /issue/createmeta/.../issuetypes` then `GET .../issuetypes/{issueTypeId}` for field metadata.
 */
export async function getCreateIssueMetadata(
  projectId: string,
  issueTypeId: string,
): Promise<IssueTypeWithCustomFields[]> {
  const encodedProject = encodeURIComponent(projectId);
  const issueTypesPage = await request<PageOfGranularIssueTypes>(`/issue/createmeta/${encodedProject}/issuetypes`, {
    params: { startAt: "0", maxResults: "100" },
  });
  const shell = issueTypesPage?.values?.find((t) => t.id === issueTypeId);
  if (!shell) {
    throw new Error(`Issue type ${issueTypeId} not found for project ${projectId}`);
  }
  const encodedIssueType = encodeURIComponent(issueTypeId);
  const fieldsPage = await request<PageOfGranularFieldMeta>(
    `/issue/createmeta/${encodedProject}/issuetypes/${encodedIssueType}`,
    { params: { startAt: "0", maxResults: "500" } },
  );

  const fields: Record<string, CustomField> = {};
  for (const meta of fieldsPage?.values ?? []) {
    const id = meta.fieldId ?? meta.key;
    if (!id) {
      continue;
    }
    fields[id] = granularFieldMetaToCustomField(meta, id);
  }

  return [
    {
      id: shell.id,
      name: shell.name,
      iconUrl: shell.iconUrl,
      subtask: shell.subtask,
      fields,
    },
  ];
}

export async function updateIssue(issueIdOrKey: string, body: Record<string, unknown>) {
  return request(`/issue/${issueIdOrKey}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type Transition = {
  id: string;
  name: string;
  to: { id: string; name: string; iconUrl: string };
};

export async function getIssueTransitions(issueIdOrKey: string) {
  const data = await request<{ transitions: Transition[] }>(`/issue/${issueIdOrKey}/transitions`);
  return data?.transitions;
}

export async function createIssueTransition(issueIdOrKey: string, transitionId: string) {
  return request(`/issue/${issueIdOrKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
}

export async function updateIssueAssignee(issueIdOrKey: string, username: string | null) {
  return request(`/issue/${issueIdOrKey}/assignee`, {
    method: "PUT",
    body: JSON.stringify({ name: username }),
  });
}

export async function startWatchingIssue(issueIdOrKey: string) {
  return request(`/issue/${issueIdOrKey}/watchers`, {
    method: "POST",
  });
}

export async function stopWatchingIssue(issueIdOrKey: string, username: string) {
  return request(`/issue/${issueIdOrKey}/watchers`, {
    method: "DELETE",
    params: { username: username },
  });
}

export type Worklog = {
  id: string;
  timeSpentSeconds: number;
  started: string;
};

export function addWorklog(
  issueIdOrKey: string,
  body: { started: string; timeSpentSeconds: number; comment?: string },
) {
  const payload: Record<string, unknown> = {
    started: body.started,
    timeSpentSeconds: body.timeSpentSeconds,
  };
  if (body.comment) {
    payload.comment = body.comment;
  }
  return request<Worklog>(`/issue/${issueIdOrKey}/worklog`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getIssueEditMetadata(issueIdOrKey: string) {
  return request<{ fields: { assignee: { autoCompleteUrl: string } } }>(`/issue/${issueIdOrKey}/editmeta`);
}

type IssueFields = { [K in keyof Issue["fields"]]: Issue["fields"][K] };

export type Version = { id: string; name: string };

export type Component = { id: string; name: string };

export type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string;
  thumbnail?: string;
  created: string;
  author: User;
};

export type Timetracking = {
  originalEstimate?: string;
  remainingEstimate?: string;
  timeSpent?: string;
};

export type IssueDetail = Issue & {
  names: Record<string, string>;
  schema: Record<string, Schema>;
  fields: IssueFields & {
    description: string;
    reporter: User;
    created: string;
    fixVersions: Version[];
    labels: string[];
    components: Component[];
    parent?: Issue;
    duedate: string | null;
    attachment: Attachment[];
    timetracking?: Timetracking | null;
  } & Record<string, unknown>;
  renderedFields: Record<string, string | null | undefined>;
};

export async function getIssue(issueIdOrKey: string) {
  const params = { expand: "transitions,names,schema,renderedFields" };

  const issue = await request<IssueDetail>(`/issue/${issueIdOrKey}`, { params });

  if (!issue) {
    return issue;
  }

  issue.fields.issuetype.iconUrl = await getAuthenticatedUri(issue.fields.issuetype.iconUrl, "image/jpeg");
  if (issue.fields.parent) {
    issue.fields.parent.fields.issuetype.iconUrl = await getAuthenticatedUri(
      issue.fields.parent.fields.issuetype.iconUrl,
      "image/jpeg",
    );
  }

  await resolveUserAvatars(issue.fields.assignee, issue.fields.reporter);

  return issue;
}

type AutocompleteIssueLinksResult = {
  sections: {
    issues: {
      id: string;
      key: string;
      summaryText: string;
    }[];
  }[];
};

export function autocompleteIssueLinks(autocompleteUrl: string, queryParams: Record<string, string>) {
  return autocomplete<AutocompleteIssueLinksResult>(autocompleteUrl, queryParams);
}

export function addAttachment(issueIdOrKey: string, path: string) {
  const formData = new FormData();
  const { size } = fs.statSync(path);
  const stream = fs.createReadStream(path);

  formData.append("file", stream, { knownLength: size });

  return request(`/issue/${issueIdOrKey}/attachments`, {
    method: "POST",
    body: formData,
    headers: { "X-Atlassian-Token": "no-check" },
  });
}

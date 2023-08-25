import fs from "fs";

import { format } from "date-fns";
import FormData from "form-data";
import markdownToAdf from "md-to-adf";

import { IssueFormValues } from "../components/CreateIssueForm";
import { CustomFieldSchema, getCustomFieldValue } from "../helpers/issues";

import { Project } from "./projects";
import { autocomplete, request } from "./request";
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
    // This library is the most reliable one I could find that does the job.
    // However, it doesn't seem to be actively maintained and makes use of an
    // obsolete NPM package called adf-builder. This could break at some point.
    // In the meantime, writing a markdown to ADF util seems overkill so let's
    // wait for any status updates on the following issue:
    // https://jira.atlassian.com/browse/JRACLOUD-77436
    jsonValues.description = markdownToAdf(values.description);
  }

  if (values.parent) {
    jsonValues.parent = {
      key: values.parent,
    };
  }

  if (values.assigneeId) {
    jsonValues.assignee = { id: values.assigneeId };
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
  };
};

type GetIssuesResponse = {
  issues: Issue[];
};

export async function getIssues({ jql } = { jql: "" }) {
  const params = {
    fields: "summary,updated,issuetype,status,priority,assignee,project",
    startAt: "0",
    maxResults: "200",
    validateQuery: "warn",
    jql,
  };

  const result = await request<GetIssuesResponse>("/search", { params });
  return result?.issues;
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

type GetCreateIssueMetadataResponse = {
  projects: { issuetypes: IssueTypeWithCustomFields[] }[];
};

export async function getCreateIssueMetadata(projectId: string) {
  const params = { expand: "projects.issuetypes.fields,style", projectIds: projectId };

  const result = await request<GetCreateIssueMetadataResponse>(`/issue/createmeta`, { params });

  return result?.projects;
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

export async function updateIssueAssignee(issueIdOrKey: string, accountId: string | null) {
  return request(`/issue/${issueIdOrKey}/assignee`, {
    method: "PUT",
    body: JSON.stringify({ accountId }),
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
  size: string;
  content: string;
  thumbnail?: string;
  created: string;
  author: User;
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
  } & Record<string, unknown>;
  renderedFields: Record<string, string | null | undefined>;
};

export function getIssue(issueIdOrKey: string) {
  const params = { expand: "transitions,names,schema,renderedFields" };

  return request<IssueDetail>(`/issue/${issueIdOrKey}`, { params });
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

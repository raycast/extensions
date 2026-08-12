import { getPreferenceValues } from "@raycast/api";
import { readFile } from "fs/promises";

export function parseList(s: string | undefined): string[] {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function quoteList(values: string[]): string {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
}

export interface WorkItem {
  id: number;
  title: string;
  state: string;
  workItemType: string;
  assignedTo: string;
  project: string;
  iterationPath: string;
  areaPath: string;
  priority?: number;
  tags: string[];
  url: string;
  changedDate: string;
  description?: string;
  acceptanceCriteria?: string;
  reproSteps?: string;
}

interface AzureWorkItem {
  id: number;
  url: string;
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.WorkItemType": string;
    "System.AssignedTo"?: { displayName: string; uniqueName: string };
    "System.TeamProject": string;
    "System.IterationPath": string;
    "System.AreaPath": string;
    "System.Tags"?: string;
    "System.ChangedDate": string;
    "System.Description"?: string;
    "Microsoft.VSTS.Common.AcceptanceCriteria"?: string;
    "Microsoft.VSTS.TCM.ReproSteps"?: string;
    "Microsoft.VSTS.Common.Priority"?: number;
  };
}

const API_VERSION = "7.1";

function getAuth(): {
  headers: Record<string, string>;
  org: string;
  email: string;
} {
  const prefs = getPreferenceValues<Preferences>();
  const token = Buffer.from(`:${prefs.personalAccessToken}`).toString("base64");
  return {
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    },
    org: prefs.organizationName,
    email: prefs.email,
  };
}

export interface WorkItemFilters {
  /** When set, filter to a single project. Empty/undefined = org-wide. */
  project?: string;
  /** When set, filter to specific states. Empty/undefined = all except Closed/Removed/Done. */
  states?: string[];
  /** When set, filter to specific work item types. Empty/undefined = all types. */
  types?: string[];
}

/**
 * Run a WIQL (Work Item Query Language) query to find IDs of work items
 * assigned to the current user that are not closed.
 *
 * Filter args take precedence over the matching Raycast preferences. Pass an
 * empty filters object to use preferences as fallback.
 */
export async function getMyWorkItems(filters: WorkItemFilters = {}): Promise<WorkItem[]> {
  const { headers, org } = getAuth();
  const project = filters.project?.trim() || undefined;
  const states = filters.states ?? [];
  const types = filters.types ?? [];

  // WIQL is scoped per-project if @project clause is included; otherwise org-wide
  const projectClause = project ? `AND [System.TeamProject] = '${project.replace(/'/g, "''")}'` : "";
  const stateClause = states.length
    ? `AND [System.State] IN (${quoteList(states)})`
    : `AND [System.State] NOT IN ('Closed', 'Removed', 'Done')`;
  const typeClause = types.length ? `AND [System.WorkItemType] IN (${quoteList(types)})` : "";

  const wiql = {
    query: `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.AssignedTo] = @Me
        ${stateClause}
        ${typeClause}
        ${projectClause}
      ORDER BY [System.ChangedDate] DESC
    `,
  };

  const wiqlUrl = project
    ? `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=${API_VERSION}`
    : `https://dev.azure.com/${org}/_apis/wit/wiql?api-version=${API_VERSION}`;

  const wiqlRes = await fetch(wiqlUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(wiql),
  });

  if (!wiqlRes.ok) {
    const body = await wiqlRes.text();
    throw new Error(`WIQL query failed (${wiqlRes.status}): ${body}`);
  }

  const wiqlData = (await wiqlRes.json()) as { workItems: { id: number }[] };
  const ids = wiqlData.workItems.map((w) => w.id);

  if (ids.length === 0) return [];

  // Fetch full details — batch endpoint takes max 200 IDs at a time
  const batches: number[][] = [];
  for (let i = 0; i < ids.length; i += 200) {
    batches.push(ids.slice(i, i + 200));
  }

  const fields = [
    "System.Title",
    "System.State",
    "System.WorkItemType",
    "System.AssignedTo",
    "System.TeamProject",
    "System.IterationPath",
    "System.AreaPath",
    "System.Tags",
    "System.ChangedDate",
    "System.Description",
    "Microsoft.VSTS.Common.AcceptanceCriteria",
    "Microsoft.VSTS.TCM.ReproSteps",
    "Microsoft.VSTS.Common.Priority",
  ];

  const allItems: AzureWorkItem[] = [];
  for (const batch of batches) {
    const detailsUrl = `https://dev.azure.com/${org}/_apis/wit/workitemsbatch?api-version=${API_VERSION}`;
    const res = await fetch(detailsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ ids: batch, fields }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Batch fetch failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as { value: AzureWorkItem[] };
    allItems.push(...data.value);
  }

  return allItems.map(mapWorkItem);
}

function mapWorkItem(raw: AzureWorkItem): WorkItem {
  const f = raw.fields;
  return {
    id: raw.id,
    title: f["System.Title"],
    state: f["System.State"],
    workItemType: f["System.WorkItemType"],
    assignedTo: f["System.AssignedTo"]?.displayName ?? "Unassigned",
    project: f["System.TeamProject"],
    iterationPath: f["System.IterationPath"],
    areaPath: f["System.AreaPath"],
    priority: f["Microsoft.VSTS.Common.Priority"],
    tags: (f["System.Tags"] ?? "")
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean),
    url: raw.url,
    changedDate: f["System.ChangedDate"],
    description: f["System.Description"],
    acceptanceCriteria: f["Microsoft.VSTS.Common.AcceptanceCriteria"],
    reproSteps: f["Microsoft.VSTS.TCM.ReproSteps"],
  };
}

export interface WorkItemTypeInfo {
  name: string;
  isDisabled: boolean;
  color?: string;
}

/**
 * List the work item types available in a project. Used to populate the type
 * dropdown when creating a new work item. The list depends on the project's
 * process template (Agile, Scrum, Basic, CMMI) and any custom types.
 */
export async function getWorkItemTypes(project: string): Promise<WorkItemTypeInfo[]> {
  const { headers, org } = getAuth();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/workitemtypes?api-version=${API_VERSION}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch work item types (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as {
    value: { name: string; isDisabled?: boolean; color?: string }[];
  };
  return data.value
    .filter((t) => !t.isDisabled)
    .map((t) => ({
      name: t.name,
      isDisabled: !!t.isDisabled,
      color: t.color,
    }));
}

/**
 * Get the union of all states across all (visible) work item types in a project.
 * Useful for the Setup view's "States to Show" picker.
 */
export async function getAllStatesForProject(project: string): Promise<string[]> {
  const types = await getWorkItemTypes(project);
  const lists = await Promise.all(types.map((t) => getWorkItemStates(project, t.name).catch(() => [])));
  return Array.from(new Set(lists.flat())).sort((a, b) => a.localeCompare(b));
}

/**
 * Get the available states for a given work item type in a project.
 * State transitions in Azure DevOps depend on the process template (Agile, Scrum, Basic, CMMI).
 */
export async function getWorkItemStates(project: string, workItemType: string): Promise<string[]> {
  const { headers, org } = getAuth();

  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/workitemtypes/${encodeURIComponent(
    workItemType,
  )}/states?api-version=${API_VERSION}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch states (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    value: { name: string; category: string }[];
  };
  return data.value.map((s) => s.name);
}

/**
 * Update a work item's state using JSON Patch.
 */
export async function updateWorkItemState(id: number, newState: string): Promise<WorkItem> {
  const { headers, org } = getAuth();

  const url = `https://dev.azure.com/${org}/_apis/wit/workitems/${id}?api-version=${API_VERSION}`;

  const patch = [
    {
      op: "add",
      path: "/fields/System.State",
      value: newState,
    },
  ];

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      ...headers,
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update state (${res.status}): ${body}`);
  }

  const data = (await res.json()) as AzureWorkItem;
  return mapWorkItem(data);
}

export function getWebUrl(item: WorkItem): string {
  const { org } = getAuth();
  return `https://dev.azure.com/${org}/${encodeURIComponent(item.project)}/_workitems/edit/${item.id}`;
}

export interface Repository {
  id: string;
  name: string;
  defaultBranch: string;
  projectId: string;
  projectName: string;
  webUrl: string;
}

type RawRepo = {
  id: string;
  name: string;
  defaultBranch?: string;
  project: { id: string; name: string };
  webUrl: string;
};

function mapRepo(r: RawRepo): Repository {
  return {
    id: r.id,
    name: r.name,
    defaultBranch: r.defaultBranch ?? "refs/heads/main",
    projectId: r.project.id,
    projectName: r.project.name,
    webUrl: r.webUrl,
  };
}

export async function getRepositories(project: string): Promise<Repository[]> {
  const { headers, org } = getAuth();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories?api-version=${API_VERSION}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch repositories (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { value: RawRepo[] };
  return data.value.map(mapRepo);
}

/**
 * Fetch all repositories across all projects the PAT has access to.
 * Iterates each project (more reliable than the org-wide endpoint, which
 * sometimes silently filters results).
 */
export async function getAllRepositories(): Promise<Repository[]> {
  const projects = await getProjects();
  const lists = await Promise.all(projects.map((p) => getRepositories(p.name).catch(() => [] as Repository[])));
  const seen = new Set<string>();
  const merged: Repository[] = [];
  for (const r of lists.flat()) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      merged.push(r);
    }
  }
  return merged.sort((a, b) => a.projectName.localeCompare(b.projectName) || a.name.localeCompare(b.name));
}

export async function getBranches(project: string, repoId: string): Promise<string[]> {
  const { headers, org } = getAuth();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/refs?filter=heads&api-version=${API_VERSION}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch branches (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { value: { name: string }[] };
  return data.value.map((r) => r.name.replace(/^refs\/heads\//, "")).sort((a, b) => a.localeCompare(b));
}

async function getRefObjectId(project: string, repoId: string, refName: string): Promise<string> {
  const { headers, org } = getAuth();
  const filter = refName.replace(/^refs\//, "");
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/refs?filter=${encodeURIComponent(filter)}&api-version=${API_VERSION}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch ref (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as {
    value: Array<{ name: string; objectId: string }>;
  };
  const match = data.value.find((r) => r.name === refName);
  if (!match) throw new Error(`Base branch not found: ${refName}`);
  return match.objectId;
}

export async function createBranchForWorkItem(opts: {
  workItemId: number;
  project?: string;
  repo: Repository;
  branchName: string;
  baseBranch?: string;
}): Promise<{ branchName: string; branchUrl: string; baseBranch: string }> {
  const { headers, org } = getAuth();
  const { workItemId, repo, branchName } = opts;
  const repoProject = repo.projectName;

  const baseRef = opts.baseBranch
    ? opts.baseBranch.startsWith("refs/heads/")
      ? opts.baseBranch
      : `refs/heads/${opts.baseBranch}`
    : repo.defaultBranch;
  const baseSha = await getRefObjectId(repoProject, repo.id, baseRef);

  const refsUrl = `https://dev.azure.com/${org}/${encodeURIComponent(repoProject)}/_apis/git/repositories/${repo.id}/refs?api-version=${API_VERSION}`;
  const refBody = [
    {
      name: `refs/heads/${branchName}`,
      oldObjectId: "0000000000000000000000000000000000000000",
      newObjectId: baseSha,
    },
  ];
  const refRes = await fetch(refsUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(refBody),
  });
  if (!refRes.ok) {
    throw new Error(`Failed to create branch (${refRes.status}): ${await refRes.text()}`);
  }
  const refData = (await refRes.json()) as {
    value: Array<{
      success: boolean;
      customMessage?: string;
      updateStatus?: string;
    }>;
  };
  const result = refData.value[0];
  if (!result?.success) {
    throw new Error(`Branch creation failed: ${result?.customMessage ?? result?.updateStatus ?? "unknown error"}`);
  }

  const linkUrl = `https://dev.azure.com/${org}/_apis/wit/workitems/${workItemId}?api-version=${API_VERSION}`;
  const artifactUrl = `vstfs:///Git/Ref/${repo.projectId}%2F${repo.id}%2FGB${branchName}`;
  const patch = [
    {
      op: "add",
      path: "/relations/-",
      value: {
        rel: "ArtifactLink",
        url: artifactUrl,
        attributes: { name: "Branch" },
      },
    },
  ];
  await fetch(linkUrl, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(patch),
  });
  // Don't fail if linking fails — branch is already created.

  const branchUrl = `${repo.webUrl}?version=GB${encodeURIComponent(branchName)}`;
  return {
    branchName,
    branchUrl,
    baseBranch: baseRef.replace(/^refs\/heads\//, ""),
  };
}

/**
 * Fetch comments / discussion HTML for a work item.
 */
export async function getWorkItemComments(project: string, id: number): Promise<string[]> {
  const { headers, org } = getAuth();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/workItems/${id}/comments?api-version=7.1-preview.4`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = (await res.json()) as { comments?: { text?: string }[] };
  return (data.comments ?? []).map((c) => c.text ?? "").filter(Boolean);
}

export interface WorkItemAttachment {
  url: string;
  name: string;
  comment?: string;
}

/**
 * Fetch attachments (AttachedFile relations) for a work item.
 */
export async function getWorkItemAttachments(id: number): Promise<WorkItemAttachment[]> {
  const { headers, org } = getAuth();
  const url = `https://dev.azure.com/${org}/_apis/wit/workitems/${id}?$expand=relations&api-version=${API_VERSION}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch attachments (${res.status}): ${body}`);
  }
  const data = (await res.json()) as {
    relations?: {
      rel: string;
      url: string;
      attributes?: { name?: string; comment?: string };
    }[];
  };
  return (data.relations ?? [])
    .filter((r) => r.rel === "AttachedFile")
    .map((r) => ({
      url: r.url,
      name: r.attributes?.name ?? decodeURIComponent(r.url.split("/").pop() ?? "attachment"),
      comment: r.attributes?.comment,
    }));
}

/**
 * Fetch the direct children of a work item via the Hierarchy-Forward link.
 */
export async function getWorkItemChildren(id: number): Promise<WorkItem[]> {
  const { headers, org } = getAuth();

  const url = `https://dev.azure.com/${org}/_apis/wit/workitems/${id}?$expand=relations&api-version=${API_VERSION}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch relations (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    relations?: { rel: string; url: string }[];
  };
  const childIds = (data.relations ?? [])
    .filter((r) => r.rel === "System.LinkTypes.Hierarchy-Forward")
    .map((r) => {
      const m = r.url.match(/\/(\d+)$/);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n !== null);

  if (childIds.length === 0) return [];

  const fields = [
    "System.Title",
    "System.State",
    "System.WorkItemType",
    "System.AssignedTo",
    "System.TeamProject",
    "System.IterationPath",
    "System.AreaPath",
    "System.Tags",
    "System.ChangedDate",
    "System.Description",
    "Microsoft.VSTS.Common.AcceptanceCriteria",
    "Microsoft.VSTS.TCM.ReproSteps",
    "Microsoft.VSTS.Common.Priority",
  ];

  const detailsUrl = `https://dev.azure.com/${org}/_apis/wit/workitemsbatch?api-version=${API_VERSION}`;
  const batchRes = await fetch(detailsUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ ids: childIds, fields }),
  });

  if (!batchRes.ok) {
    const body = await batchRes.text();
    throw new Error(`Failed to fetch children (${batchRes.status}): ${body}`);
  }

  const batchData = (await batchRes.json()) as { value: AzureWorkItem[] };
  return batchData.value.map(mapWorkItem);
}

export interface Project {
  id: string;
  name: string;
}

export async function getProjects(): Promise<Project[]> {
  const { headers, org } = getAuth();
  const all: Project[] = [];
  let continuationToken: string | undefined = undefined;
  const pageSize = 200;
  do {
    const params = new URLSearchParams({
      "api-version": API_VERSION,
      $top: String(pageSize),
    });
    if (continuationToken) {
      params.set("continuationToken", continuationToken);
    }
    const url = `https://dev.azure.com/${org}/_apis/projects?${params.toString()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch projects (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as {
      value: { id: string; name: string }[];
    };
    for (const p of data.value) all.push({ id: p.id, name: p.name });
    continuationToken = res.headers.get("x-ms-continuationtoken") ?? undefined;
  } while (continuationToken);

  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function uploadAttachment(
  project: string,
  filePath: string,
  fileName: string,
): Promise<{ id: string; url: string }> {
  const { headers, org } = getAuth();
  const buf = await readFile(filePath);
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/attachments?fileName=${encodeURIComponent(fileName)}&api-version=${API_VERSION}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: headers.Authorization,
      "Content-Type": "application/octet-stream",
    },
    body: buf,
  });
  if (!res.ok) {
    throw new Error(`Attachment upload failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as { id: string; url: string };
}

export interface CreateWorkItemInput {
  project: string;
  type: string;
  title: string;
  description?: string;
  assignedTo?: string;
  parentId?: number;
  attachments?: { filePath: string; name: string }[];
}

type PatchOp = {
  op: "add";
  path: string;
  value: string | number | object;
};

export async function createWorkItem(input: CreateWorkItemInput): Promise<WorkItem> {
  const { headers, org } = getAuth();
  const ops: PatchOp[] = [{ op: "add", path: "/fields/System.Title", value: input.title }];
  if (input.description?.trim()) {
    ops.push({
      op: "add",
      path: "/fields/System.Description",
      value: input.description,
    });
  }
  if (input.assignedTo?.trim()) {
    ops.push({
      op: "add",
      path: "/fields/System.AssignedTo",
      value: input.assignedTo,
    });
  }
  if (input.parentId) {
    ops.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `https://dev.azure.com/${org}/_apis/wit/workItems/${input.parentId}`,
      },
    });
  }
  for (const a of input.attachments ?? []) {
    const uploaded = await uploadAttachment(input.project, a.filePath, a.name);
    ops.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: "AttachedFile",
        url: uploaded.url,
        attributes: { name: a.name },
      },
    });
  }

  const createUrl = `https://dev.azure.com/${org}/${encodeURIComponent(input.project)}/_apis/wit/workitems/$${encodeURIComponent(input.type)}?api-version=${API_VERSION}`;
  const res = await fetch(createUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(ops),
  });
  if (!res.ok) {
    throw new Error(`Failed to create work item (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as AzureWorkItem;
  return mapWorkItem(data);
}

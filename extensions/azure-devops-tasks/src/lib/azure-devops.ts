import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  organization: string;
  project?: string;
  email: string;
  pat: string;
  states?: string;
  types?: string;
}

function parseList(s: string | undefined): string[] {
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
    "Microsoft.VSTS.Common.Priority"?: number;
  };
}

const API_VERSION = "7.1";

function getAuth(): {
  headers: Record<string, string>;
  org: string;
  project?: string;
  email: string;
} {
  const prefs = getPreferenceValues<Preferences>();
  const token = Buffer.from(`:${prefs.pat}`).toString("base64");
  return {
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    },
    org: prefs.organization,
    project: prefs.project?.trim() || undefined,
    email: prefs.email,
  };
}

/**
 * Run a WIQL (Work Item Query Language) query to find IDs of work items
 * assigned to the current user that are not closed.
 */
export async function getMyWorkItems(): Promise<WorkItem[]> {
  const { headers, org, project } = getAuth();
  const prefs = getPreferenceValues<Preferences>();
  const states = parseList(prefs.states);
  const types = parseList(prefs.types);

  // WIQL is scoped per-project if @project clause is included; otherwise org-wide
  const projectClause = project
    ? `AND [System.TeamProject] = '${project.replace(/'/g, "''")}'`
    : "";
  const stateClause = states.length
    ? `AND [System.State] IN (${quoteList(states)})`
    : `AND [System.State] NOT IN ('Closed', 'Removed', 'Done')`;
  const typeClause = types.length
    ? `AND [System.WorkItemType] IN (${quoteList(types)})`
    : "";

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
  };
}

/**
 * Get the available states for a given work item type in a project.
 * State transitions in Azure DevOps depend on the process template (Agile, Scrum, Basic, CMMI).
 */
export async function getWorkItemStates(
  project: string,
  workItemType: string,
): Promise<string[]> {
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
export async function updateWorkItemState(
  id: number,
  newState: string,
): Promise<WorkItem> {
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

export async function getRepositories(project: string): Promise<Repository[]> {
  const { headers, org } = getAuth();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories?api-version=${API_VERSION}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch repositories (${res.status}): ${await res.text()}`,
    );
  }
  const data = (await res.json()) as {
    value: Array<{
      id: string;
      name: string;
      defaultBranch?: string;
      project: { id: string; name: string };
      webUrl: string;
    }>;
  };
  return data.value.map((r) => ({
    id: r.id,
    name: r.name,
    defaultBranch: r.defaultBranch ?? "refs/heads/main",
    projectId: r.project.id,
    projectName: r.project.name,
    webUrl: r.webUrl,
  }));
}

async function getRefObjectId(
  project: string,
  repoId: string,
  refName: string,
): Promise<string> {
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
  project: string;
  repo: Repository;
  branchName: string;
}): Promise<{ branchName: string; branchUrl: string }> {
  const { headers, org } = getAuth();
  const { workItemId, project, repo, branchName } = opts;

  const baseSha = await getRefObjectId(project, repo.id, repo.defaultBranch);

  const refsUrl = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/git/repositories/${repo.id}/refs?api-version=${API_VERSION}`;
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
    throw new Error(
      `Failed to create branch (${refRes.status}): ${await refRes.text()}`,
    );
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
    throw new Error(
      `Branch creation failed: ${result?.customMessage ?? result?.updateStatus ?? "unknown error"}`,
    );
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
  return { branchName, branchUrl };
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

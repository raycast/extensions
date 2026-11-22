import { environment, getPreferenceValues } from "@raycast/api";
import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "url";
import { CommitInfo, Comment, Iteration, PullRequest, Relations, WorkItem } from "./types";
import { setStateColors } from "./utils";

const API = "api-version=7.1";

const FIELDS = [
  "System.Id",
  "System.Title",
  "System.WorkItemType",
  "System.State",
  "System.Parent",
  "System.AssignedTo",
  "System.IterationPath",
  "System.Description",
  "System.Tags",
  "Microsoft.VSTS.Common.AcceptanceCriteria",
  "Microsoft.VSTS.Scheduling.OriginalEstimate",
  "Microsoft.VSTS.Scheduling.StoryPoints",
  "Microsoft.VSTS.Common.StackRank",
  "Microsoft.VSTS.Scheduling.CompletedWork",
  "Microsoft.VSTS.Scheduling.RemainingWork",
];

const CUSTOM_ESTIMATE = "Custom.EstimatedWork";
let customEstimateExists: Promise<boolean> | undefined;

/** Standard fields, plus the custom estimate field only if this project has it (an unknown field makes the query fail). */
async function fieldList(): Promise<string[]> {
  const { base, project } = prefs();
  customEstimateExists ??= request<unknown>(`${base}/${project}/_apis/wit/fields/${CUSTOM_ESTIMATE}?${API}`).then(
    () => true,
    (e) => {
      if (e instanceof Error && /^Azure DevOps 404/.test(e.message)) return false;
      customEstimateExists = undefined; // transient error: look again next time
      throw e;
    },
  );
  return (await customEstimateExists) ? [...FIELDS, CUSTOM_ESTIMATE] : FIELDS;
}

function prefs() {
  const p = getPreferenceValues<Preferences>();
  const organization = encodeURIComponent(p.organization.trim());
  return {
    base: `https://dev.azure.com/${organization}`,
    project: encodeURIComponent(p.project.trim()),
    team: encodeURIComponent(p.team.trim()),
    rawOrg: p.organization.trim(),
    rawProject: p.project.trim(),
    auth: "Basic " + Buffer.from(`:${p.pat.trim()}`).toString("base64"),
  };
}

async function request<T>(
  url: string,
  init: { method?: string; body?: unknown; contentType?: string } = {},
): Promise<T> {
  const { auth } = prefs();
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Content-Type": init.contentType ?? "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  // A bad PAT can come back as 203 with an HTML sign-in page instead of a 401.
  if (res.status === 401 || res.status === 203) throw new Error("Invalid or expired Personal Access Token");
  if (res.status === 403) throw new Error("The token has no permission for this action (check its scopes)");
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(`Azure DevOps ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function workItemUrl(id: number) {
  const { base, project } = prefs();
  return `${base}/${project}/_workitems/edit/${id}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapItem(raw: any): WorkItem {
  const f = raw.fields ?? {};
  return {
    id: raw.id,
    title: f["System.Title"] ?? "",
    type: f["System.WorkItemType"] ?? "",
    state: f["System.State"] ?? "",
    parentId: f["System.Parent"],
    assignedTo: f["System.AssignedTo"]?.displayName,
    iterationPath: f["System.IterationPath"] ?? "",
    descriptionHtml: f["System.Description"],
    acceptanceHtml: f["Microsoft.VSTS.Common.AcceptanceCriteria"],
    tags: f["System.Tags"],
    storyPoints: f["Microsoft.VSTS.Scheduling.StoryPoints"],
    // Standard field first; some processes use a custom field instead.
    estimate: f["Microsoft.VSTS.Scheduling.OriginalEstimate"] ?? f[CUSTOM_ESTIMATE],
    order: f["Microsoft.VSTS.Common.StackRank"],
    completed: f["Microsoft.VSTS.Scheduling.CompletedWork"],
    remaining: f["Microsoft.VSTS.Scheduling.RemainingWork"],
  };
}

export async function getWorkItems(ids: number[]): Promise<WorkItem[]> {
  if (ids.length === 0) return [];
  const { base, project } = prefs();
  const out: WorkItem[] = [];
  const fields = await fieldList();
  for (let i = 0; i < ids.length; i += 200) {
    const res = await request<{ value: any[] }>(`${base}/${project}/_apis/wit/workitemsbatch?${API}`, {
      method: "POST",
      body: { ids: ids.slice(i, i + 200), fields, errorPolicy: "Omit" },
    });
    out.push(...res.value.filter(Boolean).map(mapItem));
  }
  await loadStateColors(out.map((w) => w.type));
  const pos = new Map(ids.map((id, i) => [id, i]));
  return out.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
}

async function wiql(query: string, top = 200): Promise<number[]> {
  const { base, project, team } = prefs();
  const res = await request<{ workItems: { id: number }[] }>(
    `${base}/${project}/${team}/_apis/wit/wiql?${API}&$top=${top}`,
    { method: "POST", body: { query } },
  );
  return res.workItems.map((w) => w.id);
}

export async function getCurrentIteration(): Promise<Iteration | undefined> {
  const { base, project, team } = prefs();
  const res = await request<{ value: any[] }>(
    `${base}/${project}/${team}/_apis/work/teamsettings/iterations?$timeframe=current&${API}`,
  );
  const it = res.value[0];
  return it && mapIteration(it);
}

function mapIteration(it: any): Iteration {
  return {
    id: it.id,
    name: it.name,
    path: it.path,
    start: it.attributes?.startDate,
    end: it.attributes?.finishDate,
    timeFrame: it.attributes?.timeFrame,
  };
}

export async function getIterations(): Promise<Iteration[]> {
  const { base, project, team } = prefs();
  const res = await request<{ value: any[] }>(`${base}/${project}/${team}/_apis/work/teamsettings/iterations?${API}`);
  return res.value.map(mapIteration);
}

const esc = (s: string) => s.replace(/'/g, "''");

/**
 * Items of an iteration in the same order and hierarchy as the Azure DevOps sprint backlog.
 * `mine` holds the ids assigned to the current user.
 */
export async function getSprintItems(iteration: Iteration): Promise<{ items: WorkItem[]; mine: Set<number> }> {
  const { base, project, team } = prefs();
  const layout = await request<{
    workItemRelations: { rel: string | null; source: { id: number } | null; target: { id: number } }[];
  }>(`${base}/${project}/${team}/_apis/work/teamsettings/iterations/${iteration.id}/workitems?${API}`);

  const ids: number[] = [];
  const parent = new Map<number, number>();
  for (const r of layout.workItemRelations) {
    if (!ids.includes(r.target.id)) ids.push(r.target.id);
    if (r.rel === "System.LinkTypes.Hierarchy-Forward" && r.source) parent.set(r.target.id, r.source.id);
  }
  const [all, mineIds] = await Promise.all([
    getWorkItems(ids),
    wiql(
      `SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] = '${esc(iteration.path)}' AND [System.AssignedTo] = @Me`,
    ),
  ]);
  const items = all.filter((w) => w.state !== "Removed");
  items.forEach((w, i) => {
    w.order = i;
    w.sprintParentId = parent.get(w.id);
  });
  return { items, mine: new Set(mineIds) };
}

export async function searchItems(text: string): Promise<WorkItem[]> {
  const t = text.trim().replace(/^#/, "");
  if (!t) return [];
  const cond = /^\d+$/.test(t)
    ? `([System.Id] = ${t} OR [System.Title] CONTAINS '${esc(t)}')`
    : `([System.Title] CONTAINS '${esc(t)}' OR [System.Description] CONTAINS '${esc(t)}')`;
  const ids = await wiql(
    `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND ${cond} AND [System.State] <> 'Removed' ORDER BY [System.ChangedDate] DESC`,
    50,
  );
  return getWorkItems(ids);
}

const loadedColorTypes = new Set<string>();

/** Fetches the state colors configured in Azure DevOps for each work item type, once per type. */
async function loadStateColors(types: string[]) {
  const { base, project } = prefs();
  await Promise.all(
    [...new Set(types)]
      .filter((t) => t && !loadedColorTypes.has(t))
      .map(async (t) => {
        try {
          const res = await request<{ value: { name: string; color?: string }[] }>(
            `${base}/${project}/_apis/wit/workitemtypes/${encodeURIComponent(t)}/states?${API}`,
          );
          const colors: Record<string, string> = {};
          for (const st of res.value) if (st.color) colors[st.name] = `#${st.color.replace(/^#/, "")}`;
          setStateColors(colors);
          loadedColorTypes.add(t);
        } catch {
          /* keep default colors */
        }
      }),
  );
}

export async function getStates(type: string): Promise<string[]> {
  const { base, project } = prefs();
  const res = await request<{ value: { name: string }[] }>(
    `${base}/${project}/_apis/wit/workitemtypes/${encodeURIComponent(type)}/states?${API}`,
  );
  return res.value.map((s) => s.name);
}

type Patch = { op: "add"; path: string; value: unknown }[];

export async function updateItem(id: number, fields: Record<string, unknown>): Promise<WorkItem> {
  const { base, project } = prefs();
  const body: Patch = Object.entries(fields).map(([k, value]) => ({ op: "add", path: `/fields/${k}`, value }));
  const raw = await request<any>(`${base}/${project}/_apis/wit/workitems/${id}?${API}`, {
    method: "PATCH",
    body,
    contentType: "application/json-patch+json",
  });
  return mapItem(raw);
}

export const setState = (id: number, state: string) => updateItem(id, { "System.State": state });
export const setIteration = (id: number, path: string) => updateItem(id, { "System.IterationPath": path });
/**
 * Adds hours on top of the latest totals stored in Azure DevOps. The update is conditional on the item's
 * revision, so it never overwrites hours logged by someone else in the meantime: on a conflict it re-reads
 * the item and tries again.
 */
export async function logHours(id: number, add: number): Promise<WorkItem> {
  const { base, project } = prefs();
  const url = `${base}/${project}/_apis/wit/workitems/${id}?${API}`;
  for (let attempt = 0; ; attempt++) {
    const raw = await request<any>(`${url}&fields=${(await fieldList()).join(",")}`);
    const fresh = mapItem(raw);
    const round = (n: number) => Math.round(n * 100) / 100;
    const completed = round((fresh.completed ?? 0) + add);
    const remaining = round(Math.max(0, (fresh.remaining ?? fresh.estimate ?? 0) - add));
    try {
      const updated = await request<any>(url, {
        method: "PATCH",
        contentType: "application/json-patch+json",
        body: [
          { op: "test", path: "/rev", value: raw.rev },
          { op: "add", path: "/fields/Microsoft.VSTS.Scheduling.CompletedWork", value: completed },
          { op: "add", path: "/fields/Microsoft.VSTS.Scheduling.RemainingWork", value: remaining },
        ],
      });
      return mapItem(updated);
    } catch (e) {
      const conflict = e instanceof Error && /Azure DevOps (409|412)/.test(e.message);
      if (!conflict || attempt >= 2) {
        throw conflict ? new Error("The work item was changed by someone else. Please try again.") : e;
      }
    }
  }
}

export async function getComments(id: number): Promise<Comment[]> {
  const { base, project } = prefs();
  const res = await request<{ comments: any[] }>(
    `${base}/${project}/_apis/wit/workItems/${id}/comments?order=desc&api-version=7.1-preview.4`,
  );
  return res.comments.map((c) => ({
    id: c.id,
    author: c.createdBy?.displayName ?? "",
    date: c.createdDate,
    html: c.text ?? "",
  }));
}

export async function addComment(id: number, text: string): Promise<void> {
  const { base, project } = prefs();
  const html = text
    .split("\n")
    .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("<br>");
  await request(`${base}/${project}/_apis/wit/workItems/${id}/comments?api-version=7.1-preview.4`, {
    method: "POST",
    body: { text: html },
  });
}

export async function createTask(input: {
  title: string;
  parentId: number;
  iterationPath: string;
  estimate?: number;
  description?: string;
  assignToMe: boolean;
}): Promise<WorkItem> {
  const { base, project, rawOrg, rawProject } = prefs();
  const ops: { op: "add"; path: string; value: unknown }[] = [
    { op: "add", path: "/fields/System.Title", value: input.title },
    { op: "add", path: "/fields/System.IterationPath", value: input.iterationPath },
    {
      op: "add",
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `https://dev.azure.com/${encodeURIComponent(rawOrg)}/${encodeURIComponent(rawProject)}/_apis/wit/workItems/${input.parentId}`,
      },
    },
  ];
  if (input.description) ops.push({ op: "add", path: "/fields/System.Description", value: input.description });
  if (input.assignToMe) {
    // Fails the whole creation when the current user can't be resolved, instead of silently skipping it.
    ops.push({ op: "add", path: "/fields/System.AssignedTo", value: await getMe() });
  }
  const create = (estimateOps: typeof ops) =>
    request<any>(`${base}/${project}/_apis/wit/workitems/$Task?${API}`, {
      method: "POST",
      body: [...ops, ...estimateOps],
      contentType: "application/json-patch+json",
    });
  const field = (name: string, value: number) => ({ op: "add" as const, path: `/fields/${name}`, value });
  let raw: any;
  if (input.estimate === undefined) {
    raw = await create([]);
  } else {
    try {
      raw = await create([
        field("Microsoft.VSTS.Scheduling.OriginalEstimate", input.estimate),
        field("Microsoft.VSTS.Scheduling.RemainingWork", input.estimate),
      ]);
    } catch (e) {
      // Only a rejected field (HTTP 400, nothing was created) may fall back to the custom estimate field.
      // Any other failure is rethrown so a task that may already exist is never created twice.
      const message = e instanceof Error ? e.message : "";
      if (!/^Azure DevOps 400/.test(message) || !/OriginalEstimate|RemainingWork/.test(message)) throw e;
      raw = await create([field("Custom.EstimatedWork", input.estimate)]);
    }
  }
  return mapItem(raw);
}

async function getMe(): Promise<string> {
  const { rawOrg } = prefs();
  const res = await request<{
    authenticatedUser?: { providerDisplayName?: string; properties?: { Account?: { $value?: string } } };
  }>(`https://dev.azure.com/${encodeURIComponent(rawOrg)}/_apis/connectionData`);
  const me = res.authenticatedUser?.properties?.Account?.$value ?? res.authenticatedUser?.providerDisplayName;
  if (!me) throw new Error("Could not determine the current user. Uncheck “Assign to me” or check your token.");
  return me;
}

export async function getStories(iterationPath: string): Promise<WorkItem[]> {
  const ids = await wiql(
    `SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] = '${esc(iterationPath)}' ` +
      `AND [System.WorkItemType] IN ('User Story','Product Backlog Item','Requirement','Feature') AND [System.State] <> 'Removed' ORDER BY [System.Id] ASC`,
  );
  return getWorkItems(ids);
}

const LINK_NAMES: Record<string, string> = {
  "System.LinkTypes.Hierarchy-Forward": "Child",
  "System.LinkTypes.Hierarchy-Reverse": "Parent",
  "System.LinkTypes.Related": "Related",
  "System.LinkTypes.Dependency-Forward": "Successor",
  "System.LinkTypes.Dependency-Reverse": "Predecessor",
  "Microsoft.VSTS.Common.TestedBy-Forward": "Tested By",
  "Microsoft.VSTS.Common.TestedBy-Reverse": "Tests",
  "Microsoft.VSTS.Common.Affects-Forward": "Affects",
  "Microsoft.VSTS.Common.Affects-Reverse": "Affected By",
};
export const LINK_ORDER = ["Parent", "Child", "Predecessor", "Successor", "Related"];

/** Parses `vstfs:///Git/<Kind>/<projectId>%2F<repoId>%2F<id>` artifact links. */
function parseArtifact(url: string, kind: "PullRequestId" | "Commit") {
  const prefix = `vstfs:///Git/${kind}/`;
  if (!url.startsWith(prefix)) return undefined;
  const [projectId, repoId, id] = decodeURIComponent(url.slice(prefix.length)).split("/");
  return projectId && repoId && id ? { projectId, repoId, id } : undefined;
}

const branchName = (ref?: string) => (ref ? ref.replace(/^refs\/heads\//, "") : undefined);

/** Branch a commit was pushed to, from the push that introduced it. Best effort: undefined if unknown. */
async function commitBranch(base: string, projectId: string, repoId: string, pushId?: number) {
  if (!pushId) return undefined;
  try {
    const push = await request<{ refUpdates?: { name: string }[] }>(
      `${base}/${projectId}/_apis/git/repositories/${repoId}/pushes/${pushId}?includeRefUpdates=true&${API}`,
    );
    const heads = (push.refUpdates ?? []).filter((r) => r.name.startsWith("refs/heads/"));
    return heads.length ? heads.map((r) => branchName(r.name)).join(", ") : undefined;
  } catch {
    return undefined;
  }
}

/** All links of a work item: related work items, pull requests and commits. */
export async function getRelations(id: number): Promise<Relations> {
  const { base, project } = prefs();
  const raw = await request<{ relations?: { rel: string; url: string; attributes?: { name?: string } }[] }>(
    `${base}/${project}/_apis/wit/workitems/${id}?$expand=relations&${API}`,
  );
  const rels = raw.relations ?? [];

  const linked: { link: string; id: number }[] = [];
  for (const r of rels) {
    if (r.rel === "ArtifactLink" || r.rel === "AttachedFile" || r.rel === "Hyperlink") continue;
    const m = /\/workItems\/(\d+)$/i.exec(r.url);
    if (m) linked.push({ link: LINK_NAMES[r.rel] ?? r.attributes?.name ?? r.rel, id: Number(m[1]) });
  }
  const fetched = await getWorkItems([...new Set(linked.map((l) => l.id))]);
  const byId = new Map(fetched.map((w) => [w.id, w]));
  const rank = (l: string) => (LINK_ORDER.includes(l) ? LINK_ORDER.indexOf(l) : LINK_ORDER.length);
  const items = linked
    .filter((l) => byId.has(l.id))
    .map((l) => ({ link: l.link, item: byId.get(l.id) as WorkItem }))
    .sort(
      (a, b) =>
        rank(a.link) - rank(b.link) ||
        a.link.localeCompare(b.link) ||
        (a.item.order ?? Infinity) - (b.item.order ?? Infinity) ||
        a.item.id - b.item.id,
    );

  const pullRequests = (
    await Promise.all(
      rels.map(async (r): Promise<PullRequest | undefined> => {
        const a = parseArtifact(r.url, "PullRequestId");
        if (!a) return undefined;
        try {
          const pr = await request<any>(
            `${base}/${a.projectId}/_apis/git/repositories/${a.repoId}/pullrequests/${a.id}?${API}`,
          );
          const repo = pr.repository;
          return {
            id: Number(a.id),
            title: pr.title,
            status: pr.status,
            author: pr.createdBy?.displayName,
            date: pr.creationDate,
            repository: repo?.name,
            sourceBranch: branchName(pr.sourceRefName),
            targetBranch: branchName(pr.targetRefName),
            url: repo
              ? `${base}/${encodeURIComponent(repo.project?.name ?? "")}/_git/${encodeURIComponent(repo.name)}/pullrequest/${a.id}`
              : undefined,
          };
        } catch {
          return { id: Number(a.id), title: "Pull request", status: "unknown" };
        }
      }),
    )
  ).filter((x): x is PullRequest => !!x);

  const commits = (
    await Promise.all(
      rels.map(async (r): Promise<CommitInfo | undefined> => {
        const a = parseArtifact(r.url, "Commit");
        if (!a) return undefined;
        try {
          const c = await request<any>(
            `${base}/${a.projectId}/_apis/git/repositories/${a.repoId}/commits/${a.id}?${API}`,
          );
          return {
            branch: await commitBranch(base, a.projectId, a.repoId, c.push?.pushId),
            sha: c.commitId,
            message: String(c.comment ?? "").split("\n")[0],
            author: c.author?.name,
            date: c.author?.date,
            url: c.remoteUrl,
          };
        } catch {
          return { sha: a.id, message: "Commit" };
        }
      }),
    )
  ).filter((x): x is CommitInfo => !!x);

  return { items, pullRequests, commits };
}

/** True only for URLs of the configured Azure DevOps organization, so the PAT is never sent elsewhere. */
function isAdoUrl(url: string): boolean {
  const { rawOrg } = prefs();
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      ((u.hostname === "dev.azure.com" && u.pathname.toLowerCase().startsWith(`/${rawOrg.toLowerCase()}/`)) ||
        u.hostname.toLowerCase() === `${rawOrg.toLowerCase()}.visualstudio.com`)
    );
  } catch {
    return false;
  }
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
};

async function downloadImage(url: string): Promise<string | undefined> {
  if (!isAdoUrl(url)) return undefined;
  const dir = join(environment.supportPath, "images");
  const key = createHash("sha1").update(url).digest("hex");
  for (const ext of Object.values(EXT)) {
    const cached = join(dir, `${key}.${ext}`);
    if (existsSync(cached)) return pathToFileURL(cached).href;
  }
  const res = await fetch(url, { headers: { Authorization: prefs().auth } });
  if (!res.ok) return undefined;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = EXT[type];
  if (!ext) return undefined;
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${key}.${ext}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return pathToFileURL(file).href;
}

/** Replaces Azure DevOps image URLs in markdown with local copies downloaded using the PAT. */
export async function localizeImages(markdown: string): Promise<string> {
  const re = /!\[([^\]]*)\]\((https?:[^)\s]+)[^)]*\)/g;
  const urls = [...new Set([...markdown.matchAll(re)].map((m) => m[2]))];
  const local = new Map<string, string | undefined>();
  await Promise.all(
    urls.map(async (u) => {
      try {
        local.set(u, await downloadImage(u));
      } catch {
        local.set(u, undefined);
      }
    }),
  );
  return markdown.replace(re, (full, alt: string, url: string) => {
    const l = local.get(url);
    return l ? `![${alt}](${l})` : full;
  });
}

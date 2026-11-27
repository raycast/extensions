/**
 * Azure DevOps calls used by the "Sprint Work Items" command.
 *
 * Uses the extension's existing preferences (organization, project, PAT) plus two optional ones:
 * - `team`: whose sprints are shown. Empty = the project's default team.
 * - `customEstimateField`: a custom field used as the estimate when Original Estimate is empty.
 *
 * Fields that only exist in some processes (Story Points, Effort, Size, Original Estimate, Completed Work…)
 * are requested only when the organization has them, so the same code works with Agile, Scrum, CMMI and Basic.
 */
import { getPreferenceValues } from "@raycast/api";
import { WorkItem } from "./azure-devops";
import { CommitInfo, Comment, Iteration, LinkedPullRequest, Relations, SprintItem } from "./sprint-types";
import { STORY_TYPES, setBacklogTypes, setStateColors } from "./sprint-utils";

const API = "api-version=7.1";
const COMMENTS_API = "api-version=7.1-preview.4";

/** Present in every process. */
const BASE_FIELDS = [
  "System.Id",
  "System.Title",
  "System.WorkItemType",
  "System.State",
  "System.Parent",
  "System.AssignedTo",
  "System.IterationPath",
  "System.AreaPath",
  "System.TeamProject",
  "System.ChangedDate",
  "System.Description",
  "System.Tags",
];

const F = {
  acceptance: "Microsoft.VSTS.Common.AcceptanceCriteria",
  reproSteps: "Microsoft.VSTS.TCM.ReproSteps",
  priority: "Microsoft.VSTS.Common.Priority",
  stackRank: "Microsoft.VSTS.Common.StackRank",
  storyPoints: "Microsoft.VSTS.Scheduling.StoryPoints",
  effort: "Microsoft.VSTS.Scheduling.Effort",
  size: "Microsoft.VSTS.Scheduling.Size",
  originalEstimate: "Microsoft.VSTS.Scheduling.OriginalEstimate",
  completed: "Microsoft.VSTS.Scheduling.CompletedWork",
  remaining: "Microsoft.VSTS.Scheduling.RemainingWork",
};

/** Only requested when the organization has them: an unknown field makes the whole batch request fail. */
const OPTIONAL_FIELDS = Object.values(F);

function prefs() {
  const p = getPreferenceValues<Preferences>();
  const org = p.organizationName.trim();
  const project = p.projectName.trim();
  const team = (p.team ?? "").trim();
  return {
    base: `https://dev.azure.com/${encodeURIComponent(org)}`,
    project: encodeURIComponent(project),
    /** `/team` or "" (Azure DevOps then uses the project's default team). */
    team: team ? `/${encodeURIComponent(team)}` : "",
    customEstimate: (p.customEstimateField ?? "").trim(),
    auth: "Basic " + Buffer.from(`:${p.personalAccessToken.trim()}`).toString("base64"),
  };
}

/** Organization name and Authorization header, for downloading images that need the PAT. */
export function adoAuth(): { org: string; auth: string } {
  const p = getPreferenceValues<Preferences>();
  return { org: p.organizationName.trim(), auth: prefs().auth };
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

let orgFields: Promise<Map<string, string>> | undefined;

/** Every field defined in the organization (reference name → display name), loaded once. */
function getOrgFields(): Promise<Map<string, string>> {
  const { base } = prefs();
  orgFields ??= request<{ value: { referenceName: string; name: string }[] }>(`${base}/_apis/wit/fields?${API}`).then(
    (res) => new Map(res.value.map((f) => [f.referenceName, f.name])),
    (e) => {
      orgFields = undefined; // transient error: look again next time
      throw e;
    },
  );
  return orgFields;
}

async function fieldList(): Promise<string[]> {
  const known = await getOrgFields();
  const { customEstimate } = prefs();
  const optional = [...OPTIONAL_FIELDS, ...(customEstimate ? [customEstimate] : [])];
  return [...BASE_FIELDS, ...optional.filter((f) => known.has(f))];
}

/** A work item type in a project. Types are per process, so the same name can differ between projects. */
interface TypeRef {
  project: string;
  type: string;
}
const typeKey = (t: TypeRef) => `${t.project.toLowerCase()}|${t.type}`;
const typeFields = new Map<string, Set<string>>();

function typeRefs(raws: { fields?: Record<string, string | undefined> }[]): TypeRef[] {
  return raws.map((r) => ({
    project: r.fields?.["System.TeamProject"] ?? "",
    type: r.fields?.["System.WorkItemType"] ?? "",
  }));
}

function uniqueTypes(types: TypeRef[]): TypeRef[] {
  const seen = new Map<string, TypeRef>();
  for (const t of types) if (t.project && t.type) seen.set(typeKey(t), t);
  return [...seen.values()];
}

/** Loads, once per type, the fields each work item type has (to know where hours can be logged). */
async function loadTypeFields(types: TypeRef[]) {
  const { base } = prefs();
  await Promise.all(
    uniqueTypes(types)
      .filter((t) => !typeFields.has(typeKey(t)))
      .map(async (t) => {
        try {
          const res = await request<{ value: { referenceName: string }[] }>(
            `${base}/${encodeURIComponent(t.project)}/_apis/wit/workitemtypes/${encodeURIComponent(t.type)}/fields?${API}`,
          );
          typeFields.set(typeKey(t), new Set(res.value.map((f) => f.referenceName)));
        } catch {
          /* unknown: hours actions stay hidden for this type */
        }
      }),
  );
}

const typeHas = (project: string, type: string, field: string) =>
  typeFields.get(typeKey({ project, type }))?.has(field) ?? false;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapItem(raw: any): SprintItem {
  const f = raw.fields ?? {};
  const { customEstimate } = prefs();
  const type = f["System.WorkItemType"] ?? "";
  const project = f["System.TeamProject"] ?? "";
  return {
    id: raw.id,
    title: f["System.Title"] ?? "",
    type,
    state: f["System.State"] ?? "",
    parentId: f["System.Parent"],
    assignedTo: f["System.AssignedTo"]?.displayName,
    iterationPath: f["System.IterationPath"] ?? "",
    descriptionHtml: f["System.Description"],
    acceptanceHtml: f[F.acceptance],
    tags: f["System.Tags"],
    storyPoints: f[F.storyPoints] ?? f[F.effort] ?? f[F.size],
    // The Custom Estimate Field, when configured, is the one the team uses, so it comes first.
    estimate: (customEstimate ? f[customEstimate] : undefined) ?? f[F.originalEstimate],
    order: f[F.stackRank],
    completed: f[F.completed],
    remaining: f[F.remaining],
    tracksHours: typeHas(project, type, F.completed),
    project,
    areaPath: f["System.AreaPath"] ?? "",
    changedDate: f["System.ChangedDate"] ?? "",
    priority: f[F.priority],
    reproStepsHtml: f[F.reproSteps],
    url: raw.url ?? "",
  };
}

/** Converts to the work item shape used by the extension's shared views (details, change state, branches). */
export function toWorkItem(it: SprintItem): WorkItem {
  return {
    id: it.id,
    title: it.title,
    state: it.state,
    workItemType: it.type,
    assignedTo: it.assignedTo ?? "Unassigned",
    project: it.project,
    iterationPath: it.iterationPath,
    areaPath: it.areaPath,
    priority: it.priority,
    tags: (it.tags ?? "")
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean),
    url: it.url,
    changedDate: it.changedDate,
    description: it.descriptionHtml,
    acceptanceCriteria: it.acceptanceHtml,
    reproSteps: it.reproStepsHtml,
  };
}

interface BacklogTypes {
  /** Requirement level, where Tasks go: User Story, Product Backlog Item, Requirement or Issue. */
  requirement: string[];
  /** Requirement and portfolio levels (Feature, Epic…): what the sprint view groups tasks under. */
  all: string[];
}

let backlogTypesPromise: Promise<BacklogTypes> | undefined;

/**
 * Work item types of the team's backlogs, from its backlog settings, so any process works (Basic's backlog
 * items are "Issue"). Falls back to the standard processes' types if the settings can't be read.
 */
export function getBacklogTypes(): Promise<BacklogTypes> {
  const { base, project, team } = prefs();
  backlogTypesPromise ??= request<{
    requirementBacklog?: { workItemTypes?: { name: string }[] };
    portfolioBacklogs?: { workItemTypes?: { name: string }[] }[];
  }>(`${base}/${project}${team}/_apis/work/backlogconfiguration?${API}`)
    .then((res) => {
      const requirement = (res.requirementBacklog?.workItemTypes ?? []).map((t) => t.name);
      const portfolio = (res.portfolioBacklogs ?? []).flatMap((b) => (b.workItemTypes ?? []).map((t) => t.name));
      if (requirement.length === 0) throw new Error("No requirement backlog");
      return { requirement, all: [...requirement, ...portfolio] };
    })
    .catch(() => {
      backlogTypesPromise = undefined; // look again next time
      return { requirement: STORY_TYPES.filter((t) => t !== "Feature" && t !== "Epic"), all: STORY_TYPES };
    })
    .then((types) => {
      setBacklogTypes(types.all);
      return types;
    });
  return backlogTypesPromise;
}

export async function getWorkItems(ids: number[]): Promise<SprintItem[]> {
  if (ids.length === 0) return [];
  // Know which types are backlog items before the rows are drawn (it decides grouping and New Task's parent).
  await getBacklogTypes();
  // Organization-level endpoint: items can come from any project (My Work Items spans projects).
  const { base } = prefs();
  const fields = await fieldList();
  const raws: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const res = await request<{ value: any[] }>(`${base}/_apis/wit/workitemsbatch?${API}`, {
      method: "POST",
      body: { ids: ids.slice(i, i + 200), fields, errorPolicy: "Omit" },
    });
    raws.push(...res.value.filter(Boolean));
  }
  const types = typeRefs(raws);
  await Promise.all([loadStateColors(types), loadTypeFields(types)]);
  const out = raws.map(mapItem);
  const pos = new Map(ids.map((id, i) => [id, i]));
  return out.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
}

async function wiql(query: string, top = 200): Promise<number[]> {
  const { base, project, team } = prefs();
  const res = await request<{ workItems: { id: number }[] }>(
    `${base}/${project}${team}/_apis/wit/wiql?${API}&$top=${top}`,
    { method: "POST", body: { query } },
  );
  return res.workItems.map((w) => w.id);
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
  const res = await request<{ value: any[] }>(`${base}/${project}${team}/_apis/work/teamsettings/iterations?${API}`);
  return res.value.map(mapIteration);
}

const esc = (s: string) => s.replace(/'/g, "''");

/**
 * Items of an iteration in the same order and hierarchy as the Azure DevOps sprint backlog.
 * `mine` holds the ids assigned to the current user.
 */
export async function getSprintItems(iteration: Iteration): Promise<{ items: SprintItem[]; mine: Set<number> }> {
  const { base, project, team } = prefs();
  const layout = await request<{
    workItemRelations: { rel: string | null; source: { id: number } | null; target: { id: number } }[];
  }>(`${base}/${project}${team}/_apis/work/teamsettings/iterations/${iteration.id}/workitems?${API}`);

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

const loadedColorTypes = new Set<string>();

/** Fetches the state colors configured in Azure DevOps for each work item type, once per type. */
async function loadStateColors(types: TypeRef[]) {
  const { base } = prefs();
  await Promise.all(
    uniqueTypes(types)
      .filter((t) => !loadedColorTypes.has(t.type))
      .map(async (t) => {
        try {
          const res = await request<{ value: { name: string; color?: string }[] }>(
            `${base}/${encodeURIComponent(t.project)}/_apis/wit/workitemtypes/${encodeURIComponent(t.type)}/states?${API}`,
          );
          const colors: Record<string, string> = {};
          for (const st of res.value) if (st.color) colors[st.name] = `#${st.color.replace(/^#/, "")}`;
          setStateColors(colors);
          loadedColorTypes.add(t.type);
        } catch {
          /* keep default colors */
        }
      }),
  );
}

export async function setIteration(id: number, path: string): Promise<SprintItem> {
  const { base } = prefs();
  const raw = await request<any>(`${base}/_apis/wit/workitems/${id}?${API}`, {
    method: "PATCH",
    body: [{ op: "add", path: "/fields/System.IterationPath", value: path }],
    contentType: "application/json-patch+json",
  });
  return mapItem(raw);
}

/**
 * Adds hours on top of the latest totals stored in Azure DevOps. The update is conditional on the item's
 * revision, so it never overwrites hours logged by someone else in the meantime: on a conflict it re-reads
 * the item and tries again. Remaining Work is only updated when the type has that field.
 */
export async function logHours(id: number, add: number): Promise<SprintItem> {
  const { base } = prefs();
  const url = `${base}/_apis/wit/workitems/${id}?${API}`;
  for (let attempt = 0; ; attempt++) {
    const raw = await request<any>(`${url}&fields=${(await fieldList()).join(",")}`);
    const [ref] = typeRefs([raw]);
    await loadTypeFields([ref]);
    const fresh = mapItem(raw);
    if (!fresh.tracksHours) throw new Error(`${ref.type} work items have no Completed Work field`);
    const round = (n: number) => Math.round(n * 100) / 100;
    const ops: { op: string; path: string; value: unknown }[] = [
      { op: "test", path: "/rev", value: raw.rev },
      { op: "add", path: `/fields/${F.completed}`, value: round((fresh.completed ?? 0) + add) },
    ];
    if (typeHas(ref.project, ref.type, F.remaining)) {
      const remaining = round(Math.max(0, (fresh.remaining ?? fresh.estimate ?? 0) - add));
      ops.push({ op: "add", path: `/fields/${F.remaining}`, value: remaining });
    }
    try {
      const updated = await request<any>(url, {
        method: "PATCH",
        contentType: "application/json-patch+json",
        body: ops,
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

/** `project` is the work item's own project; the comments API needs it. */
export async function getComments(id: number, project: string): Promise<Comment[]> {
  const { base } = prefs();
  const res = await request<{ comments: any[] }>(
    `${base}/${encodeURIComponent(project)}/_apis/wit/workItems/${id}/comments?order=desc&${COMMENTS_API}`,
  );
  return res.comments.map((c) => ({
    id: c.id,
    author: c.createdBy?.displayName ?? "",
    date: c.createdDate,
    html: c.text ?? "",
  }));
}

export async function addComment(id: number, project: string, text: string): Promise<void> {
  const { base } = prefs();
  const html = text
    .split("\n")
    .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("<br>");
  await request(`${base}/${encodeURIComponent(project)}/_apis/wit/workItems/${id}/comments?${COMMENTS_API}`, {
    method: "POST",
    body: { text: html },
  });
}

/** True when the item belongs to the project set in the preferences (the one whose sprints are listed). */
export function isConfiguredProject(project: string): boolean {
  return project.trim().toLowerCase() === getPreferenceValues<Preferences>().projectName.trim().toLowerCase();
}

/** Whether hours can be logged on this type of work item (it has a Completed Work field). */
export async function typeTracksHours(project: string, type: string): Promise<boolean> {
  await loadTypeFields([{ project, type }]);
  return typeHas(project, type, F.completed);
}

export interface EstimateFields {
  /** Fields that get the estimate, in hours. */
  fields: string[];
  /** Name to show in the form, the one Azure DevOps uses for the main field. */
  label: string;
}

/**
 * Where a new work item of this type stores its estimate in hours. The Custom Estimate Field preference wins
 * when it is set and the type has it (it is the field the team uses); otherwise Original Estimate, plus
 * Remaining Work, which starts equal to it. Undefined when the type has neither, so the form hides it.
 */
export async function getEstimateFields(project: string, type: string): Promise<EstimateFields | undefined> {
  if (!project || !type) return undefined;
  const [names] = await Promise.all([getOrgFields(), loadTypeFields([{ project, type }])]);
  const { customEstimate } = prefs();
  if (customEstimate && typeHas(project, type, customEstimate)) {
    return { fields: [customEstimate], label: names.get(customEstimate) ?? customEstimate };
  }
  if (typeHas(project, type, F.originalEstimate)) {
    return {
      fields: [F.originalEstimate, ...(typeHas(project, type, F.remaining) ? [F.remaining] : [])],
      label: names.get(F.originalEstimate) ?? "Original Estimate",
    };
  }
  return undefined;
}

interface AreaNode {
  name: string;
  children?: AreaNode[];
}

/** Every area path of a project (`Project`, `Project\\Team`, …), in tree order, to pick one in the form. */
export async function getAreas(project: string): Promise<string[]> {
  if (!project) return [];
  const { base } = prefs();
  const root = await request<AreaNode>(
    `${base}/${encodeURIComponent(project)}/_apis/wit/classificationnodes/Areas?$depth=10&${API}`,
  );
  const out: string[] = [];
  const walk = (node: AreaNode, path: string) => {
    out.push(path);
    for (const child of node.children ?? []) walk(child, `${path}\\${child.name}`);
  };
  walk(root, root.name);
  return out;
}

/** Requirement-level backlog items of a sprint (User Stories, PBIs, Requirements or Issues), to pick a parent from. */
export async function getStories(iterationPath: string): Promise<SprintItem[]> {
  if (!iterationPath) return [];
  const { requirement } = await getBacklogTypes();
  const types = requirement.map((t) => `'${esc(t)}'`).join(",");
  const ids = await wiql(
    `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.IterationPath] = '${esc(iterationPath)}' ` +
      `AND [System.WorkItemType] IN (${types}) AND [System.State] <> 'Removed' ORDER BY [System.Id] ASC`,
  );
  return getWorkItems(ids);
}

/** Work items of the configured project by number or by words in the title or description. */
export async function searchItems(text: string): Promise<SprintItem[]> {
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
const LINK_ORDER = ["Parent", "Child", "Predecessor", "Successor", "Related"];

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
  const { base } = prefs();
  const raw = await request<{ relations?: { rel: string; url: string; attributes?: { name?: string } }[] }>(
    `${base}/_apis/wit/workitems/${id}?$expand=relations&${API}`,
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
    .map((l) => ({ link: l.link, item: byId.get(l.id) as SprintItem }))
    .sort(
      (a, b) =>
        rank(a.link) - rank(b.link) ||
        a.link.localeCompare(b.link) ||
        (a.item.order ?? Infinity) - (b.item.order ?? Infinity) ||
        a.item.id - b.item.id,
    );

  const pullRequests = (
    await Promise.all(
      rels.map(async (r): Promise<LinkedPullRequest | undefined> => {
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
  ).filter((x): x is LinkedPullRequest => !!x);

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

import type {
  AgentSkill,
  Attachment,
  Comment,
  CustomerNeed,
  Cycle,
  Document,
  EntityExternalLink,
  Initiative,
  InitiativeLabel,
  InitiativeUpdate,
  Issue,
  IssueLabel,
  IssueRelation,
  Organization,
  Project,
  ProjectAttachment,
  ProjectLabel,
  ProjectMilestone,
  ProjectStatus,
  ProjectUpdate,
  Release,
  ReleaseNote,
  ReleasePipeline,
  ReleaseStage,
  Team,
  User,
  WorkflowState,
} from "@linear/sdk";

/**
 * A value that survives every tool-result boundary unchanged: JSON.stringify, structuredClone, and
 * Raycast's tool-result walker, which invokes any function it finds.
 *
 * Linear SDK models are class instances that carry their GraphQL request function as an own
 * enumerable property (`_request`) and expose relations as getters returning Promises. Returning
 * them from a tool makes the host call `_request()` with no arguments, which sends an empty POST
 * body to Linear and fails the tool after any mutation already happened. Every tool therefore
 * returns explicitly shaped plain data, and `withLinear` rejects anything that is not `Plain`.
 */
export type Plain = string | number | boolean | null | undefined | readonly Plain[] | { readonly [key: string]: Plain };

type Page<T> = { nodes: T[]; nextCursor?: string };

type Fetch<T> = PromiseLike<T | undefined> | undefined;

/** Converts an SDK timestamp to an ISO string. */
function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

/** Converts an SDK timeless date (YYYY-MM-DD) to a string. */
function day(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function json(value: unknown): Plain {
  return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Plain);
}

export async function related<T, R>(value: Fetch<T>, map: (entity: T) => R): Promise<R | undefined> {
  if (!value) return undefined;
  const entity = await value;
  return entity ? map(entity) : undefined;
}

export function userRef(user: User) {
  return { id: user.id, name: user.name, displayName: user.displayName, email: user.email };
}

export function teamRef(team: Team) {
  return { id: team.id, key: team.key, name: team.name };
}

function stateRef(state: WorkflowState) {
  return { id: state.id, name: state.name, type: state.type, color: state.color };
}

export function labelRef(label: IssueLabel | ProjectLabel | InitiativeLabel) {
  return { id: label.id, name: label.name, color: label.color };
}

export function projectRef(project: Project) {
  return { id: project.id, name: project.name, url: project.url };
}

function milestoneRef(milestone: ProjectMilestone) {
  return { id: milestone.id, name: milestone.name, targetDate: day(milestone.targetDate) };
}

export function issueRef(issue: Issue) {
  return { id: issue.id, identifier: issue.identifier, title: issue.title, url: issue.url };
}

export function initiativeRef(initiative: Initiative) {
  return { id: initiative.id, name: initiative.name, url: initiative.url };
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    url: user.url,
    avatarUrl: user.avatarUrl ?? undefined,
    title: user.title ?? undefined,
    timezone: user.timezone ?? undefined,
    statusEmoji: user.statusEmoji ?? undefined,
    statusLabel: user.statusLabel ?? undefined,
    active: user.active,
    admin: user.admin,
    guest: user.guest,
    app: user.app,
    isMe: user.isMe,
    createdAt: iso(user.createdAt),
    archivedAt: iso(user.archivedAt),
  };
}

export function serializeTeam(team: Team) {
  return {
    id: team.id,
    key: team.key,
    name: team.name,
    displayName: team.displayName,
    description: team.description ?? undefined,
    icon: team.icon ?? undefined,
    color: team.color ?? undefined,
    private: team.private,
    timezone: team.timezone,
    cyclesEnabled: team.cyclesEnabled,
    triageEnabled: team.triageEnabled,
    issueCount: team.issueCount,
    parentId: team.parentId,
    createdAt: iso(team.createdAt),
    updatedAt: iso(team.updatedAt),
    archivedAt: iso(team.archivedAt),
  };
}

export function serializeOrganization(organization: Organization) {
  return {
    id: organization.id,
    name: organization.name,
    urlKey: organization.urlKey,
    logoUrl: organization.logoUrl ?? undefined,
    userCount: organization.userCount,
    createdIssueCount: organization.createdIssueCount,
    gitBranchFormat: organization.gitBranchFormat ?? undefined,
    roadmapEnabled: organization.roadmapEnabled,
    releasesEnabled: organization.releasesEnabled,
    customersEnabled: organization.customersEnabled,
    samlEnabled: organization.samlEnabled,
    scimEnabled: organization.scimEnabled,
    createdAt: iso(organization.createdAt),
  };
}

export function serializeWorkflowState(state: WorkflowState) {
  return {
    id: state.id,
    name: state.name,
    type: state.type,
    color: state.color,
    description: state.description ?? undefined,
    position: state.position,
    teamId: state.teamId,
    archivedAt: iso(state.archivedAt),
  };
}

export function serializeLabel(label: IssueLabel | ProjectLabel | InitiativeLabel) {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description ?? undefined,
    isGroup: label.isGroup,
    parentId: label.parentId,
    teamId: "teamId" in label ? label.teamId : undefined,
    createdAt: iso(label.createdAt),
    updatedAt: iso(label.updatedAt),
    archivedAt: iso(label.archivedAt),
  };
}

export function serializeCycle(cycle: Cycle) {
  return {
    id: cycle.id,
    number: cycle.number,
    name: cycle.name ?? undefined,
    description: cycle.description ?? undefined,
    teamId: cycle.teamId,
    startsAt: iso(cycle.startsAt),
    endsAt: iso(cycle.endsAt),
    completedAt: iso(cycle.completedAt),
    progress: cycle.progress,
    isActive: cycle.isActive,
    isNext: cycle.isNext,
    isPrevious: cycle.isPrevious,
    isFuture: cycle.isFuture,
    isPast: cycle.isPast,
  };
}

export function serializeMilestone(milestone: ProjectMilestone) {
  return {
    id: milestone.id,
    name: milestone.name,
    description: milestone.description ?? undefined,
    targetDate: day(milestone.targetDate),
    status: milestone.status,
    progress: milestone.progress,
    projectId: milestone.projectId,
    createdAt: iso(milestone.createdAt),
    updatedAt: iso(milestone.updatedAt),
    archivedAt: iso(milestone.archivedAt),
  };
}

export function serializeProjectStatus(status: ProjectStatus) {
  return {
    id: status.id,
    name: status.name,
    type: status.type,
    color: status.color,
    description: status.description ?? undefined,
  };
}

/** `summary` is Linear's short project description and `description` is the project document content. */
export function serializeProject(project: Project) {
  return {
    id: project.id,
    name: project.name,
    summary: project.description,
    description: project.content ?? undefined,
    url: project.url,
    icon: project.icon ?? undefined,
    color: project.color,
    state: project.state,
    statusId: project.statusId,
    health: project.health ?? undefined,
    priority: project.priority,
    priorityLabel: project.priorityLabel,
    progress: project.progress,
    leadId: project.leadId,
    labelIds: project.labelIds,
    startDate: day(project.startDate),
    startDateResolution: project.startDateResolution ?? undefined,
    targetDate: day(project.targetDate),
    targetDateResolution: project.targetDateResolution ?? undefined,
    startedAt: iso(project.startedAt),
    completedAt: iso(project.completedAt),
    canceledAt: iso(project.canceledAt),
    trashed: project.trashed ?? undefined,
    createdAt: iso(project.createdAt),
    updatedAt: iso(project.updatedAt),
    archivedAt: iso(project.archivedAt),
  };
}

export function serializeDocument(document: Document, options: { content?: boolean } = {}) {
  return {
    id: document.id,
    title: document.title,
    url: document.url,
    slugId: document.slugId,
    icon: document.icon ?? undefined,
    color: document.color ?? undefined,
    content: options.content === false ? undefined : (document.content ?? undefined),
    projectId: document.projectId,
    initiativeId: document.initiativeId,
    issueId: document.issueId,
    creatorId: document.creatorId,
    updatedById: document.updatedById,
    trashed: document.trashed ?? undefined,
    createdAt: iso(document.createdAt),
    updatedAt: iso(document.updatedAt),
    archivedAt: iso(document.archivedAt),
  };
}

export function serializeAttachment(attachment: Attachment | ProjectAttachment) {
  return {
    id: attachment.id,
    title: attachment.title,
    subtitle: attachment.subtitle ?? undefined,
    url: attachment.url,
    sourceType: attachment.sourceType ?? undefined,
    metadata: json(attachment.metadata),
    issueId: "issueId" in attachment ? attachment.issueId : undefined,
    createdAt: iso(attachment.createdAt),
    updatedAt: iso(attachment.updatedAt),
  };
}

export function serializeExternalLink(link: EntityExternalLink) {
  return {
    id: link.id,
    label: link.label,
    url: link.url,
    createdAt: iso(link.createdAt),
  };
}

export function serializeStatusUpdate(update: ProjectUpdate | InitiativeUpdate) {
  return {
    id: update.id,
    body: update.body,
    health: update.health,
    url: update.url,
    slugId: update.slugId,
    projectId: "projectId" in update ? update.projectId : undefined,
    initiativeId: "initiativeId" in update ? update.initiativeId : undefined,
    userId: update.userId,
    isDiffHidden: update.isDiffHidden,
    isStale: update.isStale,
    commentCount: update.commentCount,
    createdAt: iso(update.createdAt),
    updatedAt: iso(update.updatedAt),
    editedAt: iso(update.editedAt),
    archivedAt: iso(update.archivedAt),
  };
}

export function serializeReleasePipeline(pipeline: ReleasePipeline) {
  return {
    id: pipeline.id,
    name: pipeline.name,
    type: pipeline.type,
    isProduction: pipeline.isProduction,
    url: pipeline.url,
    slugId: pipeline.slugId,
    approximateReleaseCount: pipeline.approximateReleaseCount,
    includePathPatterns: pipeline.includePathPatterns,
    trashed: pipeline.trashed ?? undefined,
    createdAt: iso(pipeline.createdAt),
    updatedAt: iso(pipeline.updatedAt),
    archivedAt: iso(pipeline.archivedAt),
  };
}

export function serializeReleaseStage(stage: ReleaseStage) {
  return {
    id: stage.id,
    name: stage.name,
    type: stage.type,
    color: stage.color,
    position: stage.position,
    frozen: stage.frozen,
    pipelineId: stage.pipelineId,
  };
}

export function serializeReleaseNote(note: ReleaseNote, options: { content?: boolean } = {}) {
  return {
    id: note.id,
    title: note.title ?? undefined,
    url: note.url,
    slugId: note.slugId,
    pipelineId: note.pipelineId,
    releaseCount: note.releaseCount,
    firstReleaseId: note.firstReleaseId,
    lastReleaseId: note.lastReleaseId,
    generationStatus: note.generationStatus ?? undefined,
    content: options.content ? (note.documentContent?.content ?? undefined) : undefined,
    createdAt: iso(note.createdAt),
    updatedAt: iso(note.updatedAt),
    archivedAt: iso(note.archivedAt),
  };
}

export function serializeRelease(release: Release, options: { releaseNotes?: boolean } = {}) {
  return {
    id: release.id,
    name: release.name,
    version: release.version ?? undefined,
    description: release.description ?? undefined,
    url: release.url,
    slugId: release.slugId,
    commitSha: release.commitSha ?? undefined,
    pipelineId: release.pipelineId,
    stageId: release.stageId,
    issueCount: release.issueCount,
    hasReleaseNotes: release.releaseNotes.length > 0,
    releaseNotes: options.releaseNotes ? release.releaseNotes.map((note) => serializeReleaseNote(note)) : undefined,
    startDate: day(release.startDate),
    targetDate: day(release.targetDate),
    startedAt: iso(release.startedAt),
    completedAt: iso(release.completedAt),
    canceledAt: iso(release.canceledAt),
    trashed: release.trashed ?? undefined,
    createdAt: iso(release.createdAt),
    updatedAt: iso(release.updatedAt),
    archivedAt: iso(release.archivedAt),
  };
}

export function serializeAgentSkill(skill: AgentSkill) {
  return {
    id: skill.id,
    title: skill.title,
    description: skill.description ?? undefined,
    body: skill.body,
    slugId: skill.slugId,
    icon: skill.icon ?? undefined,
    color: skill.color ?? undefined,
    shared: skill.shared,
    teamId: skill.teamId ?? undefined,
    ownerId: skill.ownerId,
    creatorId: skill.creatorId,
    recentUsageCount: skill.recentUsageCount,
    lastUsedAt: iso(skill.lastUsedAt),
    createdAt: iso(skill.createdAt),
    updatedAt: iso(skill.updatedAt),
  };
}

export async function serializeIssueRelation(relation: IssueRelation) {
  return {
    id: relation.id,
    type: relation.type,
    issue: await related(relation.issue, issueRef),
    relatedIssue: await related(relation.relatedIssue, issueRef),
    createdAt: iso(relation.createdAt),
  };
}

export function serializeCustomerNeed(need: CustomerNeed) {
  return {
    id: need.id,
    body: need.body ?? undefined,
    priority: need.priority,
    url: need.url ?? undefined,
    customerId: need.customerId,
    issueId: need.issueId,
    projectId: need.projectId,
    attachmentId: need.attachmentId,
    createdAt: iso(need.createdAt),
  };
}

export async function serializeComment(comment: Comment) {
  const agentSession = comment.agentSession ? await comment.agentSession : undefined;
  return {
    id: comment.id,
    body: comment.body,
    url: comment.url,
    author: await related(comment.user, userRef),
    onBehalfOf: await related(agentSession?.creator, userRef),
    botActor: comment.botActor
      ? {
          id: comment.botActor.id ?? undefined,
          name: comment.botActor.name ?? undefined,
          type: comment.botActor.type,
          subType: comment.botActor.subType ?? undefined,
        }
      : undefined,
    issueId: comment.issueId ?? undefined,
    projectId: comment.projectId ?? undefined,
    initiativeId: comment.initiativeId ?? undefined,
    documentContentId: comment.documentContentId ?? undefined,
    projectUpdateId: comment.projectUpdateId ?? undefined,
    initiativeUpdateId: comment.initiativeUpdateId ?? undefined,
    parentId: comment.parentId ?? undefined,
    quotedText: comment.quotedText ?? undefined,
    resolvingCommentId: comment.resolvingCommentId ?? undefined,
    reactionData: json(comment.reactionData),
    createdAt: iso(comment.createdAt),
    updatedAt: iso(comment.updatedAt),
    editedAt: iso(comment.editedAt),
    resolvedAt: iso(comment.resolvedAt),
    archivedAt: iso(comment.archivedAt),
  };
}

export type IssueField =
  | "id"
  | "title"
  | "description"
  | "projectMilestone"
  | "priority"
  | "estimate"
  | "url"
  | "gitBranchName"
  | "createdAt"
  | "updatedAt"
  | "archivedAt"
  | "completedAt"
  | "startedAt"
  | "canceledAt"
  | "dueDate"
  | "slaStartedAt"
  | "slaMediumRiskAt"
  | "slaHighRiskAt"
  | "slaBreachesAt"
  | "slaType"
  | "status"
  | "statusType"
  | "labels"
  | "triageIntel"
  | "createdBy"
  | "createdById"
  | "assignee"
  | "assigneeId"
  | "delegate"
  | "delegateId"
  | "project"
  | "projectId"
  | "parentId"
  | "team"
  | "teamId"
  | "cycleId";

const defaultIssueFields: IssueField[] = [
  "id",
  "title",
  "description",
  "priority",
  "url",
  "createdAt",
  "updatedAt",
  "status",
  "labels",
  "assignee",
  "project",
  "team",
];

/** Serializes the requested issue fields. `id` and `identifier` are always included. */
export async function serializeIssue(issue: Issue, fields?: readonly IssueField[]) {
  const requested = new Set<IssueField>(fields?.length ? ["id", ...fields] : defaultIssueFields);
  const result: Record<string, Plain> = { id: issue.id, identifier: issue.identifier };
  const direct: Partial<Record<IssueField, Plain>> = {
    title: issue.title,
    description: issue.description ?? undefined,
    priority: issue.priority,
    estimate: issue.estimate ?? undefined,
    url: issue.url,
    gitBranchName: issue.branchName,
    createdAt: iso(issue.createdAt),
    updatedAt: iso(issue.updatedAt),
    archivedAt: iso(issue.archivedAt),
    completedAt: iso(issue.completedAt),
    startedAt: iso(issue.startedAt),
    canceledAt: iso(issue.canceledAt),
    dueDate: day(issue.dueDate),
    slaStartedAt: iso(issue.slaStartedAt),
    slaMediumRiskAt: iso(issue.slaMediumRiskAt),
    slaHighRiskAt: iso(issue.slaHighRiskAt),
    slaBreachesAt: iso(issue.slaBreachesAt),
    slaType: issue.slaType ?? undefined,
    createdById: issue.creatorId,
    assigneeId: issue.assigneeId,
    delegateId: issue.delegateId,
    projectId: issue.projectId,
    parentId: issue.parentId,
    teamId: issue.teamId,
    cycleId: issue.cycleId,
  };
  for (const field of requested) {
    if (field in direct) result[field] = direct[field];
  }

  if (requested.has("status") || requested.has("statusType")) {
    const state = await related(issue.state, stateRef);
    if (requested.has("status")) result.status = state;
    if (requested.has("statusType")) result.statusType = state?.type;
  }
  if (requested.has("labels")) result.labels = (await issue.labels({ first: 250 })).nodes.map(labelRef);
  if (requested.has("createdBy")) result.createdBy = await related(issue.creator, userRef);
  if (requested.has("assignee")) result.assignee = await related(issue.assignee, userRef);
  if (requested.has("delegate")) result.delegate = await related(issue.delegate, userRef);
  if (requested.has("project")) result.project = await related(issue.project, projectRef);
  if (requested.has("projectMilestone")) result.projectMilestone = await related(issue.projectMilestone, milestoneRef);
  if (requested.has("team")) result.team = await related(issue.team, teamRef);
  if (requested.has("triageIntel")) result.triageIntel = undefined;
  return result;
}

export type InitiativeField =
  | "id"
  | "name"
  | "summary"
  | "description"
  | "url"
  | "status"
  | "priority"
  | "targetDate"
  | "health"
  | "createdAt"
  | "updatedAt"
  | "owner"
  | "creator"
  | "leadTeam"
  | "parentInitiatives"
  | "labels"
  | "projects"
  | "subInitiatives";

export const defaultInitiativeFields: InitiativeField[] = [
  "id",
  "name",
  "summary",
  "description",
  "url",
  "status",
  "priority",
  "targetDate",
  "health",
  "owner",
  "leadTeam",
];

/** `summary` is Linear's short initiative description and `description` is the initiative document content. */
export async function serializeInitiative(initiative: Initiative, fields?: readonly InitiativeField[]) {
  const selected = new Set<InitiativeField>(fields?.length ? ["id", ...fields] : defaultInitiativeFields);
  const result: Record<string, Plain> = { id: initiative.id };
  const direct: Partial<Record<InitiativeField, Plain>> = {
    name: initiative.name,
    summary: initiative.description ?? undefined,
    description: initiative.content ?? undefined,
    url: initiative.url,
    status: initiative.status,
    priority: initiative.priority,
    targetDate: day(initiative.targetDate),
    health: initiative.health ?? undefined,
    createdAt: iso(initiative.createdAt),
    updatedAt: iso(initiative.updatedAt),
  };
  for (const field of selected) {
    if (field in direct) result[field] = direct[field];
  }
  if (selected.has("owner")) result.owner = await related(initiative.owner, userRef);
  if (selected.has("creator")) result.creator = await related(initiative.creator, userRef);
  if (selected.has("leadTeam")) result.leadTeam = await related(initiative.leadTeam, teamRef);
  if (selected.has("parentInitiatives")) {
    const parent = await related(initiative.parentInitiative, initiativeRef);
    result.parentInitiatives = parent ? [parent] : [];
  }
  if (selected.has("labels")) result.labels = (await initiative.labels({ first: 250 })).nodes.map(labelRef);
  if (selected.has("projects")) result.projects = (await initiative.projects({ first: 250 })).nodes.map(projectRef);
  if (selected.has("subInitiatives"))
    result.subInitiatives = (await initiative.subInitiatives({ first: 250 })).nodes.map(initiativeRef);
  return result;
}

/** Maps the nodes of a collected page while preserving its cursor. */
export async function mapPage<T, R>(
  page: Page<T> | Promise<Page<T>>,
  map: (entity: T) => R | Promise<R>,
): Promise<Page<R>> {
  const { nodes, nextCursor } = await page;
  return { nodes: await Promise.all(nodes.map(map)), nextCursor };
}

/** Picks the requested keys from an already serialized record. */
export function pickFields(record: Record<string, Plain>, fields: readonly string[]): Record<string, Plain> {
  return Object.fromEntries(fields.map((field) => [field, record[field]]));
}

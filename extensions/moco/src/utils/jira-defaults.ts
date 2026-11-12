export interface JiraScope {
  host: string;
  prefix: string;
}

export interface TimerDefault {
  version: 1;
  projectId: number;
  taskId: number;
  projectName: string;
  taskName: string;
}

export interface JiraDefault extends TimerDefault, JiraScope {}

interface AssignedProject {
  id: number;
  name: string;
  active?: boolean;
  contract?: { active: boolean };
  tasks: { id: number; name: string; active?: boolean }[];
}

export function normalizeJiraScope(host: string, prefix: string): JiraScope {
  const url = new URL(host.includes("://") ? host.trim() : `https://${host.trim()}`);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !url.hostname
  )
    throw new Error("Enter the Jira hostname, for example your-team.atlassian.net.");
  const key = prefix.trim().replace(/-\*?$/, "").toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new Error("Enter a Jira project key, for example PROJ.");
  return { host: url.hostname.toLowerCase(), prefix: key };
}

export function scopeForIssue(issue: { url: string; key: string }): JiraScope {
  return normalizeJiraScope(new URL(issue.url).hostname, issue.key.slice(0, issue.key.lastIndexOf("-")));
}

export function sameJiraScope(a: JiraScope, b: JiraScope): boolean {
  return a.host === b.host && a.prefix === b.prefix;
}

export function makeJiraDefault(
  scope: JiraScope,
  projectId: number,
  taskId: number,
  projects: AssignedProject[],
): JiraDefault {
  return { ...makeTimerDefault(projectId, taskId, projects), host: scope.host, prefix: scope.prefix };
}

export function makeTimerDefault(projectId: number, taskId: number, projects: AssignedProject[]): TimerDefault {
  const project = projects.find((p) => p.id === projectId && isAvailableTimerProject(p));
  const task = project?.tasks.find((t) => t.id === taskId && t.active !== false);
  if (!project || !task) throw new Error("Choose an available MOCO project and role / service belonging to it.");
  return { version: 1, projectId, taskId, projectName: project.name, taskName: task.name };
}

export function isAvailableTimerProject(project: AssignedProject): boolean {
  return project.active !== false && project.contract?.active !== false;
}

export function parseTimerDefault(value: unknown): TimerDefault | undefined {
  try {
    if (typeof value !== "string") return undefined;
    const rule = JSON.parse(value);
    if (
      !rule ||
      rule.version !== 1 ||
      !Number.isSafeInteger(rule.projectId) ||
      rule.projectId < 1 ||
      !Number.isSafeInteger(rule.taskId) ||
      rule.taskId < 1 ||
      typeof rule.projectName !== "string" ||
      typeof rule.taskName !== "string"
    )
      return undefined;
    return {
      version: 1,
      projectId: rule.projectId,
      taskId: rule.taskId,
      projectName: rule.projectName,
      taskName: rule.taskName,
    };
  } catch {
    return undefined;
  }
}

export function parseJiraDefault(value: unknown): JiraDefault | undefined {
  try {
    if (typeof value !== "string") return undefined;
    const rule = JSON.parse(value);
    if (
      !rule ||
      rule.version !== 1 ||
      typeof rule.host !== "string" ||
      typeof rule.prefix !== "string" ||
      !Number.isSafeInteger(rule.projectId) ||
      rule.projectId < 1 ||
      !Number.isSafeInteger(rule.taskId) ||
      rule.taskId < 1 ||
      typeof rule.projectName !== "string" ||
      typeof rule.taskName !== "string"
    )
      return undefined;
    const scope = normalizeJiraScope(rule.host, rule.prefix);
    if (!sameJiraScope(scope, rule)) return undefined;
    return {
      ...scope,
      version: 1,
      projectId: rule.projectId,
      taskId: rule.taskId,
      projectName: rule.projectName,
      taskName: rule.taskName,
    };
  } catch {
    return undefined;
  }
}

export function resolveJiraDefault(scope: JiraScope, rule: JiraDefault | undefined, projects: AssignedProject[]) {
  if (!rule || !sameJiraScope(scope, rule)) return { projectId: "", taskId: "", notice: "" };
  return resolveTimerDefault(rule, projects);
}

export function resolveTimerDefault(rule: TimerDefault | undefined, projects: AssignedProject[]) {
  if (!rule) return { projectId: "", taskId: "", notice: "" };
  const project = projects.find((p) => p.id === rule.projectId && isAvailableTimerProject(p));
  if (!project)
    return {
      projectId: "",
      taskId: "",
      notice: "The saved MOCO project is no longer available. Choose a project and role to update this rule.",
    };
  const task = project.tasks.find((t) => t.id === rule.taskId && t.active !== false);
  return {
    projectId: String(project.id),
    taskId: task ? String(task.id) : "",
    notice: task
      ? ""
      : "The saved role / service is no longer available in this project. Choose a role to update this rule.",
  };
}

export function selectTimerDefaults(
  scope: JiraScope | undefined,
  jiraRule: JiraDefault | undefined,
  defaults: TimerDefault | undefined,
  projects: AssignedProject[],
) {
  // A stale matching rule needs repair; falling back to another project could misattribute time.
  if (scope && jiraRule && sameJiraScope(scope, jiraRule))
    return { ...resolveJiraDefault(scope, jiraRule, projects), source: "jira" as const };
  return { ...resolveTimerDefault(defaults, projects), source: defaults ? ("default" as const) : ("none" as const) };
}

export function timerDefaultKey(tenant: string): string {
  return `timer-default:v1:${encodeURIComponent(tenant.trim().toLowerCase())}`;
}

export function jiraDefaultKey(tenant: string, scope?: JiraScope): string {
  const prefix = `jira-default:v1:${encodeURIComponent(tenant.trim().toLowerCase())}:`;
  return scope ? `${prefix}${encodeURIComponent(scope.host)}:${encodeURIComponent(scope.prefix)}` : prefix;
}

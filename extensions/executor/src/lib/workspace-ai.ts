import type { ConfirmationDetails } from "./ai-tools";
import {
  activeWorkspaceId,
  listWorkspaces,
  resolveWorkspace,
  runInWorkspace,
  workspaceSummary,
  type Workspace,
} from "./workspaces";

export interface WorkspaceInput {
  workspaceId?: string;
}

function requiredWorkspaceId(input: WorkspaceInput): string {
  const workspaceId = input.workspaceId?.trim();
  if (!workspaceId) {
    throw new Error("Workspace ID is required. Call list-workspaces, then pass its exact workspaceId.");
  }
  if (!/^[a-f0-9]{64}$/.test(workspaceId)) {
    throw new Error(
      "Updates, execution, and approvals require the stable workspace ID from list-workspaces or a read result. Aliases are supported for read-only lookups only.",
    );
  }
  return workspaceId;
}

function workspaceAlias(workspace: Workspace): string {
  const alias = workspace.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return /^[a-f0-9]{64}$/.test(alias) ? "" : alias;
}

export async function resolveAiWorkspace(workspaceId?: string): Promise<Workspace> {
  const exactId = workspaceId?.trim();
  if (exactId && /^[a-f0-9]{64}$/i.test(exactId)) return resolveWorkspace(exactId);
  const workspaces = await listWorkspaces();
  if (exactId) {
    const exact = workspaces.find((workspace) => workspace.id === exactId);
    if (exact) return resolveWorkspace(exact.id);
    const matches = workspaces.filter((workspace) => workspaceAlias(workspace) === exactId.toLowerCase());
    if (matches.length > 1)
      throw new Error("This workspace alias is ambiguous. Call list-workspaces and use an exact ID.");
    if (matches.length === 1) return resolveWorkspace(matches[0].id);
    throw new Error("This workspace is no longer configured or its alias is unknown. Call list-workspaces.");
  }
  if (workspaces.length > 1) {
    throw new Error(
      "Multiple Executor workspaces are configured. Call list-workspaces, then pass the exact workspaceId to this tool.",
    );
  }

  return workspaces.length === 1 ? resolveWorkspace(workspaces[0].id) : resolveWorkspace();
}

export async function inAiWorkspace<T extends object>(
  input: WorkspaceInput = {},
  callback: () => T | Promise<T>,
): Promise<T & { workspace: ReturnType<typeof workspaceSummary> }> {
  const workspace = await resolveAiWorkspace(input.workspaceId);
  const result = await runInWorkspace(workspace, callback);
  return {
    ...result,
    workspace: workspaceSummary(workspace),
  };
}

export function inRequiredAiWorkspace<T extends object>(
  input: WorkspaceInput,
  callback: () => T | Promise<T>,
): Promise<T & { workspace: ReturnType<typeof workspaceSummary> }> {
  return inAiWorkspace({ workspaceId: requiredWorkspaceId(input) }, callback);
}

export async function confirmInAiWorkspace(
  input: WorkspaceInput = {},
  callback: () => ConfirmationDetails | Promise<ConfirmationDetails>,
): Promise<ConfirmationDetails> {
  const workspace = await resolveAiWorkspace(input.workspaceId);
  const details = await runInWorkspace(workspace, callback);
  const summary = workspaceSummary(workspace);
  return {
    ...details,
    info: [
      { name: "Workspace", value: summary.name },
      { name: "Server", value: summary.server },
      ...(summary.organization ? [{ name: "Organization", value: summary.organization }] : []),
      ...(details.info ?? []),
    ],
  };
}

export function confirmInRequiredAiWorkspace(
  input: WorkspaceInput,
  callback: () => ConfirmationDetails | Promise<ConfirmationDetails>,
): Promise<ConfirmationDetails> {
  return confirmInAiWorkspace({ workspaceId: requiredWorkspaceId(input) }, callback);
}

export async function listAiWorkspaces() {
  const [workspaces, selectedId] = await Promise.all([listWorkspaces(), activeWorkspaceId()]);
  const activeWorkspaceIdValue = workspaces.some(({ id }) => id === selectedId) ? selectedId : workspaces[0]?.id;
  return {
    activeWorkspaceId: activeWorkspaceIdValue,
    workspaces: workspaces.map((workspace) => {
      const alias = workspaceAlias(workspace);
      const unique = alias && workspaces.filter((item) => workspaceAlias(item) === alias).length === 1;
      return { ...workspaceSummary(workspace), ...(unique ? { alias } : {}) };
    }),
  };
}

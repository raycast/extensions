import { consoleUrl } from "./console";
import { normalizeServerUrl, runInWorkspace, workspaceIdFor, type Workspace } from "./workspaces";

/** The existing read-only handoff resolves the key's actual organization. */
export async function verifyWorkspace(workspace: Workspace): Promise<Workspace> {
  const baseUrl = normalizeServerUrl(workspace.baseUrl);
  if (workspace.id !== workspaceIdFor(baseUrl, workspace.apiKey))
    throw new Error("Workspace credentials do not match its identity.");
  const url = await runInWorkspace(workspace, () => consoleUrl("/"));
  const organizationSlug = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean)[0] ?? "");
  if (!organizationSlug && new URL(baseUrl).hostname === "executor.sh")
    throw new Error("Executor did not identify an organization for this key.");
  return { ...workspace, baseUrl, organizationSlug: organizationSlug || undefined };
}

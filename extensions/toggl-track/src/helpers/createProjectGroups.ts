import { Client, Workspace, Project } from "@/api";

export type ProjectGroup = {
  client?: Client;
  workspace: Workspace;
  projects: Project[];
  key: string;
};

export function createProjectGroups(projects: Project[], workspaces: Workspace[], clients: Client[]) {
  const projectGroups = projects.reduce(
    (acc, p) => {
      const client = clients.find((c) => c.id === p.client_id);
      const workspace = workspaces.find((w) => w.id === p.workspace_id);
      if (!workspace) {
        return acc;
      }

      const key = workspace.name + (client ? ` (${client.name})` : "");

      if (!acc[key]) {
        acc[key] = {
          key,
          client: client,
          workspace: workspace,
          projects: [],
        };
      }
      acc[key].projects.push(p);
      return acc;
    },
    {} as { [key: string]: ProjectGroup },
  );

  return Object.values(projectGroups).sort((a, b) => a.key.localeCompare(b.key));
}

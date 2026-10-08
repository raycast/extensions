export type StatusDestination = "profiles" | "workspaces" | "apps" | "copy";

export interface StatusItem {
  title: string;
  value: string;
  destination: StatusDestination;
}

export function buildStatusItems(status: {
  activeProfile?: string;
  activeWorkspace?: string;
  activeApp?: string;
  activeDisplay?: string;
}): StatusItem[] {
  return [
    {
      title: "Active Profile",
      value: status.activeProfile || "N/A",
      destination: "profiles",
    },
    {
      title: "Active Workspace",
      value: status.activeWorkspace || "N/A",
      destination: "workspaces",
    },
    {
      title: "Active App",
      value: status.activeApp || "N/A",
      destination: "apps",
    },
    {
      title: "Active Display",
      value: status.activeDisplay || "N/A",
      destination: "copy",
    },
  ];
}

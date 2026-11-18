import { Color } from "@raycast/api";
import type { Organization, Project } from "./types";

export function getProjectUrl(projectRef: string): string {
  return `https://supabase.com/dashboard/project/${projectRef}`;
}

export function getStatusColor(status: string): Color {
  switch (status.toLowerCase()) {
    case "active_healthy":
    case "healthy":
      return Color.Green;
    case "coming_up":
    case "going_down":
      return Color.Yellow;
    case "inactive":
    case "paused":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

export function groupProjectsByOrg(
  projects: Project[],
  organizations: Organization[]
): Array<{ org: Organization; projects: Project[] }> {
  const orgMap = new Map<string, Organization>();
  for (const org of organizations) {
    orgMap.set(org.id, org);
  }

  const grouped = new Map<string, { org: Organization; projects: Project[] }>();

  for (const project of projects) {
    const orgId = project.organization_id;
    const org = orgMap.get(orgId) || {
      id: orgId,
      name: "Unknown Organization",
    };

    if (!grouped.has(orgId)) {
      grouped.set(orgId, { org, projects: [] });
    }
    grouped.get(orgId)!.projects.push(project);
  }

  return Array.from(grouped.values()).sort((a, b) => b.projects.length - a.projects.length);
}

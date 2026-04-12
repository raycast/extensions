import { getGroups, getProjects } from "../storage";

/**
 * List saved Firebase Remote Config projects and saved groups.
 */
export default async function tool(): Promise<string> {
  const [projects, groups] = await Promise.all([getProjects(), getGroups()]);
  const lines: string[] = ["# Firebase Remote Config Projects", ""];

  lines.push(`## Projects (${projects.length})`);
  for (const project of projects) {
    lines.push(
      `- ${project.displayName} | projectId=${project.projectId} | enabled=${project.enabled ? "yes" : "no"} | tags=${project.tags.join(", ") || "none"} | credentialRef=${project.credentialRef ? "yes" : "shared/none"}`,
    );
  }
  lines.push("");

  lines.push(`## Groups (${groups.length})`);
  for (const group of groups) {
    const memberNames = projects
      .filter((project) => group.projectIds.includes(project.id))
      .map((project) => project.displayName);
    lines.push(`- ${group.name}: ${memberNames.join(", ") || "empty"}`);
  }

  return lines.join("\n");
}

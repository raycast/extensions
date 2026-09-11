export function formatSkippedSummary(projectCount: number, folderCount: number, prefix = ""): string {
  const parts: string[] = [];

  if (projectCount > 0) {
    parts.push(`Skipped ${projectCount} detected ${projectCount === 1 ? "project" : "projects"}`);
  }
  if (folderCount > 0) {
    parts.push(`Could not scan ${folderCount} ${folderCount === 1 ? "folder" : "folders"}`);
  }

  return parts.length > 0 ? `${prefix}${parts.join(". ")}.` : "";
}

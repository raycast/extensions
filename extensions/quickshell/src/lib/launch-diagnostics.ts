export type LaunchDiagnosticsReport = {
  title: string;
  workspaceName?: string;
  workspaceId?: string;
  directory?: string | null;
  command?: string | null;
  elevation?: string | null;
  denialCode?: string | null;
  issues?: string[];
  message?: string;
};

export function formatLaunchDiagnostics(report: LaunchDiagnosticsReport): string {
  const lines = [`Quick Shell launch diagnostics`, `Title: ${report.title}`];
  if (report.workspaceName) {
    lines.push(`Workspace: ${report.workspaceName}`);
  }
  if (report.workspaceId) {
    lines.push(`Workspace ID: ${report.workspaceId}`);
  }
  if (report.directory) {
    lines.push(`Directory: ${report.directory}`);
  }
  if (report.command) {
    lines.push(`Command: ${report.command}`);
  }
  if (report.elevation) {
    lines.push(`Elevation: ${report.elevation}`);
  }
  if (report.denialCode) {
    lines.push(`Denial: ${report.denialCode}`);
  }
  if (report.message) {
    lines.push(`Message: ${report.message}`);
  }
  if (report.issues?.length) {
    lines.push("Issues:");
    for (const issue of report.issues) {
      lines.push(`- ${issue}`);
    }
  }
  return lines.join("\n");
}

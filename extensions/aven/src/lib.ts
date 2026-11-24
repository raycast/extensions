export type Workspace = { key: string; name: string };
export type Project = { key: string; name: string; prefix: string };

export function parseWorkspaces(output: string): Workspace[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const key = line.split(" ")[0];
      const nameMatch = line.match(/name="([^"]*)"/);
      return { key, name: nameMatch ? nameMatch[1] : key };
    });
}

export function resolveSelection(items: { key: string }[], chosen: string, preferred: string | undefined): string {
  if (items.some((item) => item.key === chosen)) return chosen;
  const preferredKey = preferred?.trim();
  const match = items.find((item) => item.key === preferredKey);
  return (match ?? items[0])?.key ?? "";
}

export function validateTaskForm(input: { title: string; workspaceKey: string; projectKey: string }): string | null {
  if (!input.title.trim()) return "Title is required";
  if (!input.workspaceKey || !input.projectKey) return "Workspace and project are required";
  return null;
}

export function buildAddTaskArgs(input: {
  title: string;
  workspaceKey: string;
  projectKey: string;
  status: string;
  description: string;
}): string[] {
  const args = [
    "add",
    input.title,
    "--workspace",
    input.workspaceKey,
    "--project",
    input.projectKey,
    "--status",
    input.status,
  ];
  if (input.description.trim()) {
    args.push("--description", input.description);
  }
  return args;
}

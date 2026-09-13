import { Action, ActionPanel, Icon, List, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const API_BASE = "https://my.we.inc/api/v1";

interface Preferences {
  apiKey: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey.trim()}` };
}

async function openPreview(project: Project, apiKey: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching preview…" });
  try {
    const response = await fetch(`${API_BASE}/projects/${project.id}/preview`, {
      headers: authHeaders(apiKey),
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = (await response.json()) as Record<string, unknown>;
    const url = [data.preview_url, data.url, data.previewUrl].find(
      (value): value is string => typeof value === "string" && value.startsWith("http"),
    );
    if (!url) {
      throw new Error("No preview URL returned for this project");
    }
    await open(url);
    toast.style = Toast.Style.Success;
    toast.title = "Preview opened";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to open preview";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export default function ListProjects() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const { isLoading, data } = useFetch<ProjectsResponse>(`${API_BASE}/projects?limit=100`, {
    headers: authHeaders(apiKey),
    failureToastOptions: {
      title: "Failed to load projects",
      message: "Check that your WeInc API key is valid.",
    },
  });

  const projects = data?.projects ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects…">
      <List.EmptyView
        icon={Icon.AppWindowGrid3x3}
        title="No Projects Found"
        description="Create your first website at my.we.inc"
      />
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={Icon.Globe}
          title={project.name}
          subtitle={project.description ?? undefined}
          accessories={[{ tag: project.status }, { date: new Date(project.updated_at), tooltip: "Last updated" }]}
          actions={
            <ActionPanel>
              <Action title="Open Preview" icon={Icon.Eye} onAction={() => openPreview(project, apiKey)} />
              <Action.CopyToClipboard title="Copy Project Id" content={project.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BaseUrl, buildHeaders, endpoints } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatFullDate, formatRelativeDate } from "../utils/formatting";
import { ProjectDetail } from "./ProjectDetail";

export function ProjectRow({
  project,
  subtitle,
}: {
  project: { id: string; title: string; created_at: string; url?: string };
  subtitle?: string;
}) {
  const { token } = useAuth();
  const { push } = useNavigation();

  const { data, isLoading } = useFetch(
    BaseUrl + endpoints.data.path + `?filter[project_id]=${project.id}&page[limit]=1`,
    {
      headers: buildHeaders(token),
      parseResponse: async (response) => {
        const json = await response.json();
        return endpoints.data.schema.parse(json);
      },
    },
  );

  return (
    <List.Item
      title={project.title || "Untitled project"}
      subtitle={subtitle}
      icon={Icon.BulletPoints}
      accessories={[
        isLoading
          ? { text: "Loading..." }
          : { tag: { value: `${data?.page.total_count ?? 0} data entries`, color: Color.SecondaryText } },
        { text: formatRelativeDate(project.created_at), tooltip: formatFullDate(project.created_at) },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Browse Project"
            icon={Icon.ArrowRight}
            onAction={() => push(<ProjectDetail projectId={project.id} title={project.title} url={project.url} />)}
          />
          <Action.OpenInBrowser
            url={project.url ?? `https://dovetail.com/projects/${project.id}`}
            title="Open in Dovetail"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Link"
            content={project.url ?? `https://dovetail.com/projects/${project.id}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

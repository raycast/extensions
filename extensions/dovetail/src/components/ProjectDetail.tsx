import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import qs from "qs";
import { BaseUrl, buildHeaders, endpoints, HighlightsResponse, TagsResponse } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatFullDate, formatRelativeDate } from "../utils/formatting";
import { DataDetail } from "./DataDetail";
import { DocDetail } from "./DocDetail";

const PROJECT_ITEM_LIMIT = 25;

function projectItemsUrl(path: string, projectId: string) {
  return (
    BaseUrl + path + `?${qs.stringify({ filter: { project_id: projectId }, page: { limit: PROJECT_ITEM_LIMIT } })}`
  );
}

function useProjectDocs(projectId: string) {
  const { token } = useAuth();
  return useFetch(projectItemsUrl(endpoints.docs.path, projectId), {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return endpoints.docs.schema.parse(json);
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load project docs" });
    },
  });
}

function useProjectData(projectId: string) {
  const { token } = useAuth();
  return useFetch(projectItemsUrl(endpoints.data.path, projectId), {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return endpoints.data.schema.parse(json);
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load project data" });
    },
  });
}

function useProjectHighlights(projectId: string) {
  const { token } = useAuth();
  return useFetch(projectItemsUrl("/v1/highlights", projectId), {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return HighlightsResponse.parse(json);
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load highlights" });
    },
  });
}

function useProjectTags(projectId: string) {
  const { token } = useAuth();
  return useFetch(projectItemsUrl("/v1/tags", projectId), {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      return TagsResponse.parse(json);
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load tags" });
    },
  });
}

export function ProjectDetail({ projectId, title, url }: { projectId: string; title: string; url?: string }) {
  const { push } = useNavigation();
  const projectUrl = url ?? `https://dovetail.com/projects/${projectId}`;

  const { data: docsResult, isLoading: docsLoading } = useProjectDocs(projectId);
  const { data: dataResult, isLoading: dataLoading } = useProjectData(projectId);
  const { data: highlightsResult, isLoading: highlightsLoading } = useProjectHighlights(projectId);
  const { data: tagsResult, isLoading: tagsLoading } = useProjectTags(projectId);

  const docs = docsResult?.data ?? [];
  const dataEntries = dataResult?.data ?? [];
  const highlights = highlightsResult?.data ?? [];
  const tags = tagsResult?.data ?? [];

  return (
    <List
      isLoading={docsLoading || dataLoading || highlightsLoading || tagsLoading}
      navigationTitle={title}
      searchBarPlaceholder="Filter this project..."
    >
      <List.Section title="Docs" subtitle={docsResult ? `${docsResult.page.total_count}` : undefined}>
        {docs.map((item) => (
          <List.Item
            key={item.id}
            title={item.title || "Untitled doc"}
            icon={Icon.Stars}
            accessories={[{ text: formatRelativeDate(item.created_at), tooltip: formatFullDate(item.created_at) }]}
            actions={
              <ActionPanel>
                <Action title="Show Details" onAction={() => push(<DocDetail docId={item.id} />)} />
                <Action.OpenInBrowser
                  url={item.url ?? `https://dovetail.com/docs/${item.id}`}
                  title="Open in Dovetail"
                />
              </ActionPanel>
            }
          />
        ))}
        {docsResult?.page.has_more && (
          <List.Item
            title={`View all ${docsResult.page.total_count} docs in Dovetail`}
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${projectUrl}/insights`} title="Open in Dovetail" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Data" subtitle={dataResult ? `${dataResult.page.total_count}` : undefined}>
        {dataEntries.map((item) => (
          <List.Item
            key={item.id}
            title={item.title || "Untitled"}
            icon={Icon.Document}
            accessories={[{ text: formatRelativeDate(item.created_at), tooltip: formatFullDate(item.created_at) }]}
            actions={
              <ActionPanel>
                <Action title="Show Details" onAction={() => push(<DataDetail dataId={item.id} />)} />
                <Action.OpenInBrowser
                  url={item.url ?? `https://dovetail.com/data/${item.id}`}
                  title="Open in Dovetail"
                />
              </ActionPanel>
            }
          />
        ))}
        {dataResult?.page.has_more && (
          <List.Item
            title={`View all ${dataResult.page.total_count} data entries in Dovetail`}
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${projectUrl}/notes`} title="Open in Dovetail" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Highlights" subtitle={highlightsResult ? `${highlightsResult.page.total_count}` : undefined}>
        {highlights.map((highlight) => (
          <List.Item
            key={highlight.id}
            title={highlight.text || "Untitled highlight"}
            icon={Icon.Highlight}
            accessories={[
              ...highlight.tags.slice(0, 3).map((tag) => ({ tag: { value: tag.title, color: Color.Yellow } })),
              { text: formatRelativeDate(highlight.created_at), tooltip: formatFullDate(highlight.created_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={highlight.url ?? `https://dovetail.com/data/${highlight.note_id}#:v:h=${highlight.id}`}
                  title="Open in Dovetail"
                />
              </ActionPanel>
            }
          />
        ))}
        {highlightsResult?.page.has_more && (
          <List.Item
            title={`View all ${highlightsResult.page.total_count} highlights in Dovetail`}
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${projectUrl}/highlights`} title="Open in Dovetail" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Tags" subtitle={tagsResult ? `${tagsResult.page.total_count}` : undefined}>
        {tags.map((tag) => (
          <List.Item
            key={tag.id}
            title={tag.title}
            icon={Icon.Tag}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={tag.url ?? `${projectUrl}/tags`} title="Open in Dovetail" />
              </ActionPanel>
            }
          />
        ))}
        {tagsResult?.page.has_more && (
          <List.Item
            title={`View all ${tagsResult.page.total_count} tags in Dovetail`}
            icon={Icon.ArrowRight}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`${projectUrl}/tags`} title="Open in Dovetail" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Item
        title="Open Project in Dovetail"
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={projectUrl} title="Open in Dovetail" />
          </ActionPanel>
        }
      />
    </List>
  );
}

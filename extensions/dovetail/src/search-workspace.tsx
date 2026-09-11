import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { z } from "zod";
import { BaseUrl, buildHeaders, SearchV2Item, SearchV2Response } from "./api/endpoints";
import { ChannelDetail } from "./components/ChannelDetail";
import { DataDetail } from "./components/DataDetail";
import { DocDetail } from "./components/DocDetail";
import { FolderContents } from "./components/FolderContents";
import { ProjectDetail } from "./components/ProjectDetail";
import { useAuth } from "./hooks/useAuth";
import { formatFullDate, formatRelativeDate, truncate } from "./utils/formatting";

type SearchV2Data = z.infer<typeof SearchV2Response>["data"];
type SectionKey = keyof SearchV2Data;

const SECTIONS: { key: SectionKey; title: string; icon: Icon }[] = [
  { key: "projects", title: "Projects", icon: Icon.BulletPoints },
  { key: "insights", title: "Insights", icon: Icon.Stars },
  { key: "notes", title: "Data", icon: Icon.Document },
  { key: "highlights", title: "Highlights", icon: Icon.Highlight },
  { key: "tags", title: "Tags", icon: Icon.Tag },
  { key: "channels", title: "Channels", icon: Icon.BarChart },
  { key: "themes", title: "Themes", icon: Icon.LightBulb },
  { key: "dashboards", title: "Dashboards", icon: Icon.PieChart },
  { key: "folders", title: "Folders", icon: Icon.Folder },
  { key: "people", title: "People", icon: Icon.Person },
  { key: "agents", title: "Agents", icon: Icon.Bolt },
];

// Sections with a richer in-app view get a "Show Details"-style push as the primary action,
// instead of defaulting straight out to the browser like every other section still does.
function primaryAction(key: SectionKey, item: SearchV2Item, itemTitle: string, push: (element: ReactNode) => void) {
  switch (key) {
    case "projects":
      return (
        <Action
          title="Browse Project"
          icon={Icon.ArrowRight}
          onAction={() => push(<ProjectDetail projectId={item.id} title={itemTitle} url={item.url ?? undefined} />)}
        />
      );
    case "insights":
      return <Action title="Show Details" onAction={() => push(<DocDetail docId={item.id} />)} />;
    case "notes":
      return <Action title="Show Details" onAction={() => push(<DataDetail dataId={item.id} />)} />;
    case "channels":
      return (
        <Action
          title="Browse Channel"
          icon={Icon.ArrowRight}
          onAction={() => push(<ChannelDetail channelId={item.id} title={itemTitle} />)}
        />
      );
    case "folders":
      return (
        <Action
          title="Open Folder"
          icon={Icon.ArrowRight}
          onAction={() => push(<FolderContents folderId={item.id} title={itemTitle} />)}
        />
      );
    default:
      return null;
  }
}

export default function SearchWorkspace() {
  const { token } = useAuth();
  const { push } = useNavigation();
  const [query, setQuery] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  const { isLoading, data } = useFetch(BaseUrl + "/v2/search", {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({
      options: { query },
      limit: 20,
    }),
    execute: query.trim().length > 0,
    keepPreviousData: true,
    parseResponse: async (response) => {
      const json = await response.json();
      return SearchV2Response.parse(json);
    },
    mapResult: (result) => ({ data: result.data }),
    initialData: undefined,
    onError: (error) => {
      showFailureToast(error, { title: "Search failed" });
    },
  });

  const results = data;
  const total = results?.total ?? 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search everything in your workspace..."
    >
      {!query.trim() ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search across all content in your Dovetail workspace" />
      ) : (
        SECTIONS.map(({ key, title, icon }) => {
          const items = (results?.[key] as SearchV2Item[] | undefined) ?? [];
          if (items.length === 0) return null;
          return (
            <List.Section key={key} title={title} subtitle={`${items.length}`}>
              {items.map((item) => {
                const itemTitle = item.title ?? item.name ?? truncate(item.preview_text) ?? "Untitled";
                const primary = primaryAction(key, item, itemTitle, push);
                return (
                  <List.Item
                    key={item.id}
                    title={itemTitle}
                    subtitle={isShowingDetail ? undefined : (item.project_title ?? undefined)}
                    icon={icon}
                    accessories={
                      isShowingDetail
                        ? undefined
                        : item.created_at
                          ? [{ text: formatRelativeDate(item.created_at), tooltip: formatFullDate(item.created_at) }]
                          : undefined
                    }
                    detail={
                      <List.Item.Detail
                        markdown={item.preview_text ? `${item.preview_text}` : undefined}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Type" text={title} />
                            {item.project_title && (
                              <List.Item.Detail.Metadata.Label title="Project" text={item.project_title} />
                            )}
                            {item.created_at && (
                              <List.Item.Detail.Metadata.Label title="Created" text={formatFullDate(item.created_at)} />
                            )}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        {primary}
                        {item.url && <Action.OpenInBrowser url={item.url} title="Open in Dovetail" />}
                        {item.url && (
                          <Action.CopyToClipboard
                            title="Copy Link"
                            content={item.url}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                          />
                        )}
                        <Action
                          title={isShowingDetail ? "Hide Details" : "Show Details"}
                          icon={Icon.Sidebar}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => setIsShowingDetail((v) => !v)}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })
      )}
      {query.trim() && !isLoading && total === 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No results" description={`Nothing found for "${query}"`} />
      )}
    </List>
  );
}

import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext, useState } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { Insight, listInsights } from "./api/insights";

function Insights() {
  const { selectedId } = useContext(ProjectsContext);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCachedPromise(
    (id: string, term: string) => listInsights(id, term ? { search: term } : undefined).then((r) => r.results),
    [selectedId ?? "", search],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => void showFailureToast(e, { title: "Couldn't load insights" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search insights..."
      searchBarAccessory={<ProjectSelector />}
      isShowingDetail
      throttle
      onSearchTextChange={setSearch}
    >
      {data && data.length > 0 ? (
        <List.Section title="Results">
          {data.map((insight) => (
            <InsightItem key={insight.id} insight={insight} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No insights found" />
      )}
    </List>
  );
}

function InsightItem({ insight }: { insight: Insight }) {
  const appUrl = useUrl(`insights/${insight.short_id}`);
  const title = insight.name || insight.derived_name || `Insight ${insight.short_id}`;
  return (
    <List.Item
      title={title}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={title} />
              <List.Item.Detail.Metadata.Separator />
              {insight.description && (
                <>
                  <List.Item.Detail.Metadata.Label title="Description" text={insight.description} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Short ID" text={insight.short_id} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Favorited" text={insight.favorited.toString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Last Modified" text={insight.last_modified_at} />
              {insight.created_by && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Created By" text={insight.created_by.email} />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={title}>
          <Action.OpenInBrowser url={appUrl} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={appUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Short ID"
            content={insight.short_id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <WithProjects>
      <Insights />
    </WithProjects>
  );
}

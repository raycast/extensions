import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { Dashboard, listDashboards } from "./api/dashboards";

function Dashboards() {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = useCachedPromise(
    (id: string) => listDashboards(id).then((r) => r.results),
    [selectedId ?? ""],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => showFailureToast(e, { title: "Couldn't load dashboards" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search dashboards..."
      searchBarAccessory={<ProjectSelector />}
      isShowingDetail
      throttle
    >
      {data ? (
        <List.Section title="Results">
          {data.map((dashboard) => (
            <DashboardItem key={dashboard.id} dashboard={dashboard} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function DashboardItem({ dashboard }: { dashboard: Dashboard }) {
  const appUrl = useUrl(`dashboard/${dashboard.id}`);
  return (
    <List.Item
      key={dashboard.id}
      title={dashboard.name}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={dashboard.name} />
              <List.Item.Detail.Metadata.Separator />
              {dashboard.description && (
                <>
                  <List.Item.Detail.Metadata.Label title="Description" text={dashboard.description} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Pinned" text={dashboard.pinned.toString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Shared" text={dashboard.is_shared.toString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created At" text={dashboard.created_at} />
              <List.Item.Detail.Metadata.Separator />
              {dashboard.created_by && (
                <>
                  <List.Item.Detail.Metadata.Label title="Created By" text={dashboard.created_by.email} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Deleted" text={dashboard.deleted.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={dashboard.name}>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={appUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy URL"
              content={appUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <WithProjects>
      <Dashboards />
    </WithProjects>
  );
}

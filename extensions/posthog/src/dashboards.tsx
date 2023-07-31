import { Action, ActionPanel, List } from "@raycast/api";
import { usePostHogClient } from "../helpers/usePostHogClient";
import { useUrl } from "../helpers/useUrl";
import { WithProjects, ProjectSelector, ProjectsContext } from "../helpers/ProjectsContext";
import { useContext } from "react";

type SearchResult = {
  count: number;
  next: null;
  previous: null;
  results: Dashboard[];
};

type Dashboard = {
  id: number;
  name: string;
  description: string;
  pinned: boolean;
  is_shared: boolean;
  deleted: boolean;
  created_at: string;
  created_by: {
    email: string;
  };
};

function Cohorts() {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = usePostHogClient<SearchResult>("projects/" + selectedId + "/dashboards");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search dashboards..."
      searchBarAccessory={<ProjectSelector />}
      isShowingDetail={true}
      throttle
    >
      {data ? (
        <List.Section title="Results">
          {data.results.map((dashboard) => (
            <ResultsListSection key={dashboard.id} dashboard={dashboard} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

const ResultsListSection = ({ dashboard }: { dashboard: Dashboard }) => {
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
};

export default function Command() {
  return (
    <WithProjects>
      <Cohorts />
    </WithProjects>
  );
}

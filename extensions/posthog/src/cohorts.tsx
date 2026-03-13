import { Action, ActionPanel, List } from "@raycast/api";
import { usePostHogClient } from "../helpers/usePostHogClient";
import { useUrl } from "../helpers/useUrl";
import { WithProjects, ProjectSelector, ProjectsContext } from "../helpers/ProjectsContext";
import { useContext } from "react";

type SearchResult = {
  count: number;
  next: null;
  previous: null;
  results: Cohort[];
};

type Cohort = {
  id: number;
  name: string;
  description: string;
  count: number;
  deleted: boolean;
  last_calculation: string;
  created_at: string;
  created_by: {
    email: string;
  };
};

function Cohorts() {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = usePostHogClient<SearchResult>("projects/" + selectedId + "/cohorts");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cohorts..."
      searchBarAccessory={<ProjectSelector />}
      isShowingDetail={true}
      throttle
    >
      {data ? (
        <List.Section title="Results">
          {data.results.map((cohort) => (
            <ResultsListSection key={cohort.id} cohort={cohort} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

const ResultsListSection = ({ cohort }: { cohort: Cohort }) => {
  const appUrl = useUrl(`cohorts/${cohort.id}`);

  return (
    <List.Item
      key={cohort.id}
      title={cohort.name}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={cohort.name} />
              <List.Item.Detail.Metadata.Separator />
              {cohort.description && (
                <>
                  <List.Item.Detail.Metadata.Label title="Description" text={cohort.description} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              {cohort.count && (
                <>
                  <List.Item.Detail.Metadata.Label title="Count" text={cohort.count.toString()} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              {cohort.last_calculation && (
                <>
                  <List.Item.Detail.Metadata.Label title="Last Calculation" text={cohort.last_calculation} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Created At" text={cohort.created_at} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created By" text={cohort.created_by.email} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Deleted" text={cohort.deleted.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={cohort.name}>
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

import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { Cohort, listCohorts } from "./api/cohorts";

function Cohorts() {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = useCachedPromise(
    (id: string) => listCohorts(id).then((r) => r.results),
    [selectedId ?? ""],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => showFailureToast(e, { title: "Couldn't load cohorts" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cohorts..."
      searchBarAccessory={<ProjectSelector />}
      isShowingDetail
      throttle
    >
      {data ? (
        <List.Section title="Results">
          {data.map((cohort) => (
            <CohortItem key={cohort.id} cohort={cohort} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function CohortItem({ cohort }: { cohort: Cohort }) {
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
              {cohort.count != null && (
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
}

export default function Command() {
  return (
    <WithProjects>
      <Cohorts />
    </WithProjects>
  );
}

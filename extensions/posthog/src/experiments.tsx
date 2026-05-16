import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { Experiment, listExperiments } from "./api/experiments";

function statusOf(e: Experiment): "Running" | "Complete" | "Draft" | "Archived" {
  if (e.archived) return "Archived";
  if (!e.start_date) return "Draft";
  if (e.end_date) return "Complete";
  return "Running";
}

function Experiments() {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = useCachedPromise(
    (id: string) => listExperiments(id).then((r) => r.results),
    [selectedId ?? ""],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => showFailureToast(e, { title: "Couldn't load experiments" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search experiments..."
      searchBarAccessory={<ProjectSelector />}
      throttle
    >
      {data && data.length > 0 ? (
        <List.Section title="Results">
          {data.map((experiment) => (
            <ExperimentItem key={experiment.id} experiment={experiment} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No experiments" />
      )}
    </List>
  );
}

function ExperimentItem({ experiment }: { experiment: Experiment }) {
  const appUrl = useUrl(`experiments/${experiment.id}`);
  const status = statusOf(experiment);
  return (
    <List.Item
      title={experiment.name}
      subtitle={experiment.feature_flag_key}
      accessories={[{ text: status }]}
      actions={
        <ActionPanel title={experiment.name}>
          <Action.OpenInBrowser url={appUrl} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={appUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <WithProjects>
      <Experiments />
    </WithProjects>
  );
}

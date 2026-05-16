import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { Survey, listSurveys } from "./api/surveys";

function statusOf(s: Survey): "Active" | "Draft" | "Archived" | "Completed" {
  if (s.archived) return "Archived";
  if (!s.start_date) return "Draft";
  if (s.end_date) return "Completed";
  return "Active";
}

function Surveys() {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = useCachedPromise(
    (id: string) => listSurveys(id).then((r) => r.results),
    [selectedId ?? ""],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => void showFailureToast(e, { title: "Couldn't load surveys" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search surveys..."
      searchBarAccessory={<ProjectSelector />}
      throttle
    >
      {data && data.length > 0 ? (
        <List.Section title="Results">
          {data.map((survey) => (
            <SurveyItem key={survey.id} survey={survey} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No surveys" />
      )}
    </List>
  );
}

function SurveyItem({ survey }: { survey: Survey }) {
  const appUrl = useUrl(`surveys/${survey.id}`);
  return (
    <List.Item
      title={survey.name}
      subtitle={survey.type}
      accessories={[{ text: statusOf(survey) }]}
      actions={
        <ActionPanel title={survey.name}>
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
      <Surveys />
    </WithProjects>
  );
}

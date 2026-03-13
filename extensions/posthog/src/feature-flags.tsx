import { Action, ActionPanel, List } from "@raycast/api";
import { usePostHogClient } from "../helpers/usePostHogClient";
import { useUrl } from "../helpers/useUrl";
import { WithProjects, ProjectSelector, ProjectsContext } from "../helpers/ProjectsContext";
import { useContext } from "react";

type SearchResult = {
  count: number;
  next: null;
  previous: null;
  results: FeatureFlag[];
};

type FeatureFlag = {
  id: number;
  key: string;
};

function FeatureFlags() {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = usePostHogClient<SearchResult>("projects/" + selectedId + "/feature_flags");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search feature flags..."
      searchBarAccessory={<ProjectSelector />}
      throttle
    >
      {data ? (
        <List.Section title="Results">
          {data.results.map((featureFlag) => (
            <ResultsListSection key={featureFlag.id} featureFlag={featureFlag} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

const ResultsListSection = ({ featureFlag }: { featureFlag: FeatureFlag }) => {
  const appUrl = useUrl(`feature_flags/${featureFlag.id}`);

  return (
    <List.Item
      key={featureFlag.id}
      title={featureFlag.key}
      actions={
        <ActionPanel title={featureFlag.key}>
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
      <FeatureFlags />
    </WithProjects>
  );
}

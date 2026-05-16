import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { FeatureFlag, listFeatureFlags } from "./api/flags";

function FeatureFlags() {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = useCachedPromise(
    (id: string) => listFeatureFlags(id).then((r) => r.results),
    [selectedId ?? ""],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => showFailureToast(e, { title: "Couldn't load feature flags" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search feature flags..."
      searchBarAccessory={<ProjectSelector />}
      throttle
    >
      {data ? (
        <List.Section title="Results">
          {data.map((featureFlag) => (
            <FeatureFlagItem key={featureFlag.id} featureFlag={featureFlag} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function FeatureFlagItem({ featureFlag }: { featureFlag: FeatureFlag }) {
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
}

export default function Command() {
  return (
    <WithProjects>
      <FeatureFlags />
    </WithProjects>
  );
}

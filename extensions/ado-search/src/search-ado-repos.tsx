import { useState } from "react";
import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { preparedPersonalAccessToken, baseApiUrl } from "./preferences";
import { AdoGitrepostitoriesResponse } from "./types";

type State = {
  filter: string;
};

export default () => {
  const [filterState, setFilter] = useState<State>({ filter: "" });
  const { data, isLoading } = useFetch<AdoGitrepostitoriesResponse>(
    `${baseApiUrl()}/_apis/git/repositories?api-version=1.0`,
    {
      headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoading}
          tooltip="Select Project filter"
          onChange={(newValue) => setFilter((previous) => ({ ...previous, filter: newValue }))}
        >
          <List.Dropdown.Item key="all" title="All Projects" value="" />
          {data?.value
            .map((repository) => repository.project)
            .filter((project, index, self) => index === self.findIndex((t) => t.id === project.id))
            .map((project) => <List.Dropdown.Item key={project.id} title={project.name} value={project.id} />)}
        </List.Dropdown>
      }
    >
      {data?.value
        .filter((repository) => !repository.isDisabled)
        .filter((repository) => !filterState?.filter || repository.project.id === filterState.filter)
        .map((repository) => (
          <List.Item
            key={repository.id}
            title={repository.name}
            subtitle={repository.project.name}
            accessories={[{ text: repository.defaultBranch?.replace("refs/heads/", ""), icon: Icon.Code }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={repository.webUrl} />
                <Action.CopyToClipboard
                  title="Copy Git Ssh URL"
                  content={repository.sshUrl}
                  icon={Icon.CodeBlock}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                <Action.CopyToClipboard
                  title="Copy Git Remote URL"
                  content={repository.remoteUrl}
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd"], key: "g" }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

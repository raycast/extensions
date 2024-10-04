import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useSearchRepositories } from "./api";
import React from "react";
import { CreateIssue } from "./components/commands/create-issue";

export default function Command() {
  const { data, isLoading } = useSearchRepositories();
  const { push } = useNavigation();

  return (
    <List searchBarPlaceholder="Search for repositories" isLoading={isLoading}>
      {data &&
        data.data.map((repository) => (
          <List.Item
            key={repository.id}
            title={repository.full_name}
            subtitle={repository.description}
            accessories={[
              { icon: { source: repository.avatar_url } },
              { icon: repository.private ? Icon.Lock : undefined, text: repository.private ? "private" : "" },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open" url={repository.html_url} />
                <Action
                  title="Create Issue"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<CreateIssue repo={repository.full_name} />)}
                />
                <Action.CopyToClipboard title="Copy Ssh URL" content={repository.ssh_url} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

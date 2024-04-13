import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { preparedPersonalAccessToken, baseApiUrl } from "./preferences";
import { AdoGitrepostitoriesResponse } from "./types";

export default () => {
  const { data, isLoading } = useFetch<AdoGitrepostitoriesResponse>(
    `${baseApiUrl()}/_apis/git/repositories?api-version=1.0`,
    {
      headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
    },
  );

  return (
    <List isLoading={isLoading}>
      {data?.value
        .filter((repository) => !repository.isDisabled)
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
                  title="Copy Git SSH URL"
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

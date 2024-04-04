import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { personalAccessToken, organizationName } from "./preferences";
import { AdoGitrepostitoriesResponse } from "./types";

export default () => {
  const url = "https://dev.azure.com/" + organizationName + "/_apis/git/repositories?api-version=1.0";
  const { data, isLoading } = useFetch<AdoGitrepostitoriesResponse>(url, {
    headers: { Accept: "application/json", Authorization: `Basic ${personalAccessToken}` },
  });

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
                <Action.CopyToClipboard title="Copy Git SSH URL" content={repository.sshUrl} />
                <Action.CopyToClipboard title="Copy Git Remote URL" content={repository.remoteUrl} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

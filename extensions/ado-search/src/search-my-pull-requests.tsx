import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { preparedPersonalAccessToken, baseApiUrl } from "./preferences";
import { AdoPrResponse } from "./types";
import { ErrorView } from "./components/sprint/ErrorView";

export default () => {
  // The user the PAT belongs to. connectionData works with any token scope, unlike the identities API.
  const entityData = useFetch<{ authenticatedUser?: { id?: string } }>(`${baseApiUrl()}/_apis/connectionData`, {
    headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
  });
  const userId = entityData.data?.authenticatedUser?.id;
  // Only once the user is known: without a creatorId, Azure DevOps returns everyone's pull requests.
  const prData = useFetch<AdoPrResponse>(
    `${baseApiUrl()}/_apis/git/pullrequests?searchCriteria.creatorId=${userId}&api-version=7.1-preview.1`,
    {
      headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
      execute: !!userId,
    },
  );

  // A failed request (or a token whose user can't be found) shows its error with Retry, never an empty list.
  const error =
    entityData.error ??
    prData.error ??
    (!entityData.isLoading && entityData.data && !userId
      ? new Error("Couldn’t find the user of this token")
      : undefined);
  const retry = () => {
    entityData.revalidate();
    if (userId) prData.revalidate();
  };

  return (
    <List isLoading={prData.isLoading || entityData.isLoading}>
      {error ? (
        <ErrorView error={error} retry={retry} title="Couldn’t load your pull requests" />
      ) : !prData.isLoading && !entityData.isLoading && prData.data?.value.length === 0 ? (
        <List.EmptyView title="No pull requests found" />
      ) : (
        prData?.data?.value.map((pullRequest) => {
          const webUrl = `${baseApiUrl()}/${pullRequest.repository.project.name}/_git/${pullRequest.repository.name}/pullrequest/${pullRequest.pullRequestId}`;
          return (
            <List.Item
              key={pullRequest.pullRequestId}
              title={pullRequest.title}
              subtitle={pullRequest.repository.name}
              accessories={[
                {
                  text: `${pullRequest.sourceRefName.replace("refs/heads/", "")} => ${pullRequest.targetRefName.replace("refs/heads/", "")}`,
                  icon: Icon.Code,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Browser" url={webUrl} />
                  <Action.CopyToClipboard
                    title="Copy Web URL"
                    content={webUrl}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
};

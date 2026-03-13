import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { preparedPersonalAccessToken, baseApiUrl, baseApiUrlEntities, email } from "./preferences";
import { AdoIdentityResponse, AdoPrResponse } from "./types";

export default () => {
  const entityData = useFetch<AdoIdentityResponse>(
    `${baseApiUrlEntities()}/_apis/identities?searchFilter=MailAddress&filterValue=${email}&api-version=7.1`,
    {
      headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
    },
  );
  const prData = useFetch<AdoPrResponse>(
    `${baseApiUrl()}/_apis/git/pullrequests?searchCriteria.creatorId=${entityData.data?.value[0].id}&api-version=7.1-preview.1`,
    {
      headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
    },
  );

  return (
    <List isLoading={prData.isLoading || entityData.isLoading}>
      {!prData.isLoading && !entityData.isLoading && prData.data?.value.length === 0 ? (
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

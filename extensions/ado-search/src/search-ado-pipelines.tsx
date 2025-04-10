import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { preparedPersonalAccessToken, baseApiUrl, projectName } from "./preferences";
import { AdoPipelinesResponse } from "./types";

export default () => {
  const { data, isLoading } = useFetch<AdoPipelinesResponse>(
    `${baseApiUrl()}/${projectName}/_apis/pipelines?api-version=7.1`,
    {
      headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && data?.value.length === 0 ? (
        <List.EmptyView title="No pipelines found" />
      ) : (
        data?.value.map((pipelines) => (
          <List.Item
            key={pipelines.id}
            title={pipelines.name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={pipelines._links.web.href} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
};

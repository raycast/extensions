import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { preparedPersonalAccessToken, baseApiUrl } from "./preferences";
import { AdoWorkItemsResponse, AdoWorkItemDetailsResponse } from "./types";

export default () => {
  const pbiData = useFetch<AdoWorkItemsResponse>(`${baseApiUrl()}/_apis/wit/wiql?api-version=7.1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${preparedPersonalAccessToken()}`,
    },
    body: JSON.stringify({
      query: `SELECT [System.Id] 
                FROM WorkItems
                WHERE [System.AssignedTo] = @me 
                AND [System.WorkItemType] = 'Product Backlog Item'
                AND [System.State] <> 'Done' AND [System.State] <> 'Removed'
                ORDER BY [System.ChangedDate] DESC`,
    }),
  });

  const workItemIds = pbiData.data?.workItems?.length ? pbiData.data.workItems.map((item) => item.id).join(",") : "";

  const workItemDetails = useFetch<AdoWorkItemDetailsResponse>(
    `${baseApiUrl()}/_apis/wit/workitems?ids=${workItemIds}&api-version=7.1`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${preparedPersonalAccessToken()}`,
      },
    },
  );

  return (
    <List isLoading={pbiData.isLoading || workItemDetails.isLoading}>
      {!pbiData.isLoading && !workItemDetails.isLoading && workItemDetails.data?.value.length === 0 ? (
        <List.EmptyView title="No product backlog items found" />
      ) : (
        workItemDetails?.data?.value?.map((pbi) => (
          <List.Item
            key={pbi.id}
            title={pbi.fields["System.Title"] ?? "Unknown"}
            subtitle={pbi.fields["System.State"] ?? ""}
            accessories={[{ text: pbi.id.toString(), icon: Icon.Dot }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={`${baseApiUrl()}/_workitems/edit/${pbi.id}`} />
                <Action.CopyToClipboard
                  title="Copy Work Item URL"
                  content={`${baseApiUrl()}/_workitems/edit/${pbi.id}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Work Item Id"
                  content={pbi.id}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
};

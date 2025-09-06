import dayjs from "dayjs";
import relatimeTime from "dayjs/plugin/relativeTime";
import { API_URL, headers, parseResponse, useKeygenPaginated } from "./keygen";
import { APIToken } from "./interfaces";
import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import OpenInKeygen from "./open-in-keygen";
dayjs.extend(relatimeTime);

export default function APITokens() {
  const { isLoading, data: tokens, pagination, error, mutate } = useKeygenPaginated<APIToken>("tokens");

  async function confirmAndDelete(token: APIToken) {
    const options: Alert.Options = {
      title: "Are you absolutely sure?",
      message:
        "This action cannot be undone. This will permanently revoke the API token. All subsequent API requests utilizing the token will no longer work.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Revoke",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Revoking License", token.attributes.name);
      try {
        await mutate(
          fetch(API_URL + `tokens/${token.id}`, {
            method: "DELETE",
            headers,
          }).then(parseResponse),
          {
            optimisticUpdate(data) {
              return data.filter((t) => t.id !== token.id);
            },
            shouldRevalidateAfter: false,
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Revoked License";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not revoke";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail pagination={pagination}>
      {!isLoading && !tokens.length && !error ? (
        <List.EmptyView description="No results" />
      ) : (
        tokens.map((token) => (
          <List.Item
            key={token.id}
            icon={Icon.Key}
            title={token.id.slice(0, 8)}
            subtitle={token.attributes.name || undefined}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Resource" />
                    <List.Item.Detail.Metadata.Label title="ID" text={token.id} />
                    <List.Item.Detail.Metadata.Label title="Created" text={dayjs(token.attributes.created).fromNow()} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Attributes" />
                    <List.Item.Detail.Metadata.TagList title="Subtypes">
                      <List.Item.Detail.Metadata.TagList.Item text={token.attributes.kind} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Name" text={token.attributes.name || "--"} />
                    <List.Item.Detail.Metadata.Label title="Expiry" text={token.attributes.expiry || "--"} />

                    <List.Item.Detail.Metadata.TagList title="Permissions">
                      {token.attributes.permissions.map((permission) => (
                        <List.Item.Detail.Metadata.TagList.Item key={permission} text={permission} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Relationships" />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <OpenInKeygen route={`tokens/${token.id}`} />
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  onAction={() => confirmAndDelete(token)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

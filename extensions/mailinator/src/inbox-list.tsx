import { ActionPanel, List, Icon } from "@raycast/api";
import { LoginAction } from "./components/login-action";
import { useApi } from "./utils/use-api";
import { usePersistedState } from "./utils/use-persisted-state";

/**
 * Inbox List
 */
export default function Command() {
  const [token, setToken, isLoadingToken] = usePersistedState<string>("api-token", "");
  const { isLoading: isLoadingApi, data, isAuthenticated } = useApi(token);

  const isLoading = isLoadingToken || isLoadingApi;

  return (
    <List isLoading={isLoading} isShowingDetail={isAuthenticated}>
      {isAuthenticated && (
        <List.EmptyView icon="🧘🏻" title="Your inbox is empty" description="Can't find any messages!" />
      )}

      {!isAuthenticated && (
        <List.EmptyView
          icon="🚧"
          title="Sign in to view your messages"
          description="Press enter to sign in with your API token from Mailinator"
          actions={
            <ActionPanel>
              <LoginAction setToken={setToken} />
            </ActionPanel>
          }
        />
      )}

      {data.map((item) => (
        <List.Item
          key={item.id}
          icon={item.source === "sms" ? Icon.Message : Icon.Envelope}
          title={item.from}
          detail={
            <List.Item.Detail
              markdown={`**${item.from}**\n\n${item.content}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Time" text={item.timeAgo} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Source" text={item.source} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

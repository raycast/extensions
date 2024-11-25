import { ActionPanel, List, Icon } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { LoginAction } from "./components/login-action";
import { useApi } from "./utils/use-api";

/**
 * Inbox List
 */
export default function Command() {
  const { setValue: setToken } = useLocalStorage("api-token");
  const { isLoading, data, isAuthenticated } = useApi();

  return (
    <List isLoading={isLoading} isShowingDetail={isAuthenticated}>
      <List.EmptyView
        icon={isAuthenticated ? "🧘🏻" : "🚧"}
        title={isAuthenticated ? "Your inbox is empty" : "Sign in to view your messages"}
        description={
          isAuthenticated ? "Can't find any messages!" : "Press enter to sign in with your API token from Mailinator"
        }
        actions={
          <ActionPanel>
            <LoginAction setToken={setToken} />
          </ActionPanel>
        }
      />

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

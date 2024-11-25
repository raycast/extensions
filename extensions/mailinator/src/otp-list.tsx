import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { LoginAction } from "./components/login-action";
import { useApi } from "./utils/use-api";

/**
 * Retrieve OTP
 */
export default function Command() {
  const { setValue: setToken } = useLocalStorage("api-token");
  const { isLoading, data, isAuthenticated } = useApi();

  const otpItems = data.filter((item) => item.otpNumber);

  return (
    <List isLoading={isLoading}>
      {isAuthenticated && (
        <List.EmptyView
          icon="🧘🏻"
          title="Your inbox is empty"
          description="Can't find any messages!"
          actions={
            <ActionPanel>
              <LoginAction setToken={setToken} />
            </ActionPanel>
          }
        />
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

      {otpItems.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.ChevronRight}
          title={item.from}
          subtitle={item.otpNumber}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.otpNumber} />
            </ActionPanel>
          }
          accessories={[{ tag: { value: item.timeAgo, color: Color.Green }, icon: Icon.Clock }]}
        />
      ))}
    </List>
  );
}

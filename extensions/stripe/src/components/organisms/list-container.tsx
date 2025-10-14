import { List, Action, ActionPanel, openExtensionPreferences, useNavigation } from "@raycast/api";
import { Environment } from "@src/types";
import { useProfileContext } from "@src/hooks";
import { WelcomeScreen } from "@src/components/organisms/welcome-screen";

export function ListContainer({ children, ...listProps }: List.Props) {
  const { activeProfile, activeEnvironment, setActiveEnvironment } = useProfileContext();
  const { push } = useNavigation();

  // Check if current profile has the required API key for the selected environment
  const currentApiKey = activeEnvironment === "test" ? activeProfile?.testApiKey : activeProfile?.liveApiKey;
  const hasNoApiKey = !currentApiKey;

  // Check if profile has ANY keys at all
  const hasNoKeys = !activeProfile?.testApiKey && !activeProfile?.liveApiKey;

  return (
    <List
      {...listProps}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Environment"
          value={activeEnvironment}
          onChange={(newValue) => {
            setActiveEnvironment(newValue as Environment);
          }}
        >
          <List.Dropdown.Item title="Test Mode" value="test" />
          <List.Dropdown.Item title="Live Mode" value="live" />
        </List.Dropdown>
      }
    >
      {hasNoApiKey ? (
        <List.EmptyView
          title={hasNoKeys ? "Welcome to Stripe!" : `No ${activeEnvironment === "test" ? "Test" : "Live"} API Key`}
          description={
            hasNoKeys
              ? `Connect your Stripe account to get started.\n\nYou'll be able to:\n• View charges, customers, and events\n• Check account balance\n• Manage subscriptions\n• Create payment links\n• And more!\n\nProfile: "${activeProfile?.name || "Unknown"}"`
              : `The current profile doesn't have a ${activeEnvironment === "test" ? "test" : "live"} API key.\n\nYou can either:\n• Switch to ${activeEnvironment === "test" ? "Live" : "Test"} Mode (if you have that key)\n• Add the ${activeEnvironment === "test" ? "test" : "live"} key to this profile\n• Switch to a different profile with Cmd+Shift+A\n\nProfile: "${activeProfile?.name || "Unknown"}"`
          }
          actions={
            <ActionPanel>
              {hasNoKeys ? (
                <>
                  <Action title="Setup Stripe Account" onAction={() => push(<WelcomeScreen onComplete={() => {}} />)} />
                  <Action.OpenInBrowser
                    title="Get Api Keys from Stripe"
                    url="https://dashboard.stripe.com/apikeys"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </>
              ) : (
                <>
                  <Action title="Add Api Keys" onAction={() => push(<WelcomeScreen onComplete={() => {}} />)} />
                  <Action
                    title={`Switch to ${activeEnvironment === "test" ? "Live" : "Test"} Mode`}
                    onAction={() => setActiveEnvironment(activeEnvironment === "test" ? "live" : "test")}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                </>
              )}
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
                shortcut={{ modifiers: ["cmd"], key: "," }}
              />
            </ActionPanel>
          }
        />
      ) : (
        children
      )}
    </List>
  );
}

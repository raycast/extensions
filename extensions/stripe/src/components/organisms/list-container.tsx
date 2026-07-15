import { List, Action, ActionPanel, openExtensionPreferences } from "@raycast/api";
import { useProfileContext } from "@src/hooks";
import { SHORTCUTS } from "@src/constants/keyboard-shortcuts";
import { getEnvironmentLabel, getOppositeEnvironment } from "@src/utils";
import { Environment } from "@src/types";

/**
 * ListContainer - Wrapper component for Stripe data list views.
 *
 * Provides consistent UI features for all list-based Stripe views:
 * - Environment switcher dropdown (Test/Live mode)
 * - Empty state handling when API keys are missing
 * - Profile-aware error messages and setup guidance
 * - Quick actions to configure API keys or switch environments
 *
 * @param children - List items to display when API key is configured
 * @param listProps - Standard Raycast List component props
 *
 * @example
 * ```tsx
 * <ListContainer isLoading={isLoading} searchBarPlaceholder="Search customers...">
 *   {customers.map(customer => <List.Item ... />)}
 * </ListContainer>
 * ```
 */
export function ListContainer({ children, ...listProps }: List.Props) {
  const { activeProfile, activeEnvironment, setActiveEnvironment } = useProfileContext();

  // Check if current profile has the required API key for the selected environment
  const currentApiKey = activeEnvironment === "test" ? activeProfile?.testApiKey : activeProfile?.liveApiKey;
  const hasNoApiKey = !currentApiKey;

  // Check if profile has ANY keys at all
  const hasNoKeys = !activeProfile?.testApiKey && !activeProfile?.liveApiKey;

  // Environment labels
  const oppositeEnv = getOppositeEnvironment(activeEnvironment);
  const envLabel = getEnvironmentLabel(activeEnvironment);
  const oppositeEnvLabel = getEnvironmentLabel(oppositeEnv);

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
          title={hasNoKeys ? "Welcome to Stripe!" : `No ${envLabel} API Key`}
          description={
            hasNoKeys
              ? `Connect your Stripe account to get started.\n\nYou'll be able to:\n• View charges, customers, and events\n• Check account balance\n• Manage subscriptions\n• Create payment links\n• And more!\n\nProfile: "${activeProfile?.name || "Unknown"}"`
              : `The current profile doesn't have a ${activeEnvironment} API key.\n\nYou can either:\n• Switch to ${oppositeEnvLabel} Mode (if you have that key)\n• Add the ${activeEnvironment} key to this profile\n• Switch to a different profile with Cmd+Shift+A\n\nProfile: "${activeProfile?.name || "Unknown"}"`
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
                shortcut={SHORTCUTS.OPEN_PREFERENCES}
              />
              {hasNoKeys ? (
                <Action.OpenInBrowser
                  title="Get Api Keys from Stripe"
                  url="https://dashboard.stripe.com/apikeys"
                  shortcut={SHORTCUTS.OPEN_BROWSER}
                />
              ) : (
                <Action
                  title={`Switch to ${oppositeEnvLabel} Mode`}
                  onAction={() => setActiveEnvironment(oppositeEnv)}
                  shortcut={SHORTCUTS.SWITCH_ENVIRONMENT}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        children
      )}
    </List>
  );
}

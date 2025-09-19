import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  openCommandPreferences,
  open,
  Icon,
  Color,
} from "@raycast/api";
import { validateApiKey } from "../auth";

interface AuthenticationGateProps {
  children: React.ReactNode;
}

interface Preferences {
  apiKey?: string;
  apiUrl: string;
}

function AuthenticationGate({ children }: AuthenticationGateProps) {
  const preferences = getPreferenceValues<Preferences>();

  // Check if we have a valid API key in preferences
  const hasValidApiKey = preferences.apiKey && validateApiKey(preferences.apiKey.trim());

  if (hasValidApiKey) {
    return <>{children}</>;
  }

  // No valid API key - show error view like cal.com extension
  return (
    <List>
      <List.EmptyView
        title="Unable to connect to ToneClone"
        description="Check your API key"
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            <Action
              title="Get Your Api Key"
              onAction={() => open("https://app.toneclone.ai/api-keys")}
              icon={Icon.Globe}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default AuthenticationGate;

import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { API_URL } from "./config";
import { changeApiToken, generateToken, manageSubscription } from "./shortcuts";

interface Props {
  reason?: "missing-token" | "manual";
}

export function Welcome({ reason }: Props) {
  const dashboardUrl = `${API_URL}/dashboard`;
  const tokensUrl = `${API_URL}/dashboard/tokens`;
  const billingUrl = `${API_URL}/dashboard/billing`;

  const banner =
    reason === "missing-token"
      ? "> **Set up needed.** Add your API token to start using Raycall.\n\n"
      : "";

  const markdown = `# Welcome to Raycall

Save any URL from Raycast. Search your bookmarks later in natural language.

${banner}## Three steps to get started

**1. Sign up & start a trial** - Open the dashboard, create an account, and start your 7-day free trial. Card required, cancel anytime.

**2. Generate an API token** - Visit **Settings → API Tokens**, click **Generate**, and copy the token (shown only once).

**3. Paste into Raycast** - Press **⌘ T** below (or run *Change API Token*) to open extension preferences. Paste the token into the **API Token** field.

That's it. **Save URL** and **Search Bookmarks** will start working immediately.

---

### Tips

- The Raycast Browser Extension is recommended for the **Save URL** command to auto-detect the active browser tab.
- Run **Manage Subscription** at any time to update billing.
`;

  return (
    <Detail
      navigationTitle="Welcome to Raycall"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Dashboard"
            url={dashboardUrl}
            icon={Icon.Globe}
          />
          <Action
            title="Change API Token"
            icon={Icon.Key}
            shortcut={changeApiToken}
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser
            title="Generate Token in Dashboard"
            url={tokensUrl}
            icon={Icon.PlusCircle}
            shortcut={generateToken}
          />
          <Action.OpenInBrowser
            title="Manage Subscription"
            url={billingUrl}
            icon={Icon.CreditCard}
            shortcut={manageSubscription}
          />
        </ActionPanel>
      }
    />
  );
}

export function isConfigured(prefs: { apiToken?: string }): boolean {
  return !!prefs.apiToken && prefs.apiToken.trim() !== "";
}

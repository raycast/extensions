import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { getApiToken } from "../utils/graphql";
import TokenSetup from "./TokenSetup";

export default function TokenManagement() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showingSetup, setShowingSetup] = useState(false);
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchToken() {
      try {
        const apiToken = await getApiToken();
        setToken(apiToken);
      } catch (error) {
        // Ignore error
      } finally {
        setIsLoading(false);
      }
    }

    fetchToken();
  }, []);

  if (showingSetup) {
    return (
      <TokenSetup
        onTokenSaved={() => {
          setShowingSetup(false);
          pop();
        }}
      />
    );
  }

  const tokenStatus = token ? "✅ Token is configured" : "⚠️ Token is not configured";
  const tokenDisplay = token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : "Not set";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Stacks API Token"
      markdown={`
# Stacks API Token

${tokenStatus}

Current token: **${tokenDisplay}**

You can update your token at any time by clicking the button below.

## About API Tokens

The API token allows the Stacks extension to access your saved resources securely. It is stored locally on your device and is only used to communicate with the Stacks API.

## How to find your token

1. Open betterstacks.com and make sure you're logged in
2. Open browser developer tools (Right-click → Inspect or Cmd+Option+I)
3. Navigate to 'Application' tab (Chrome) or 'Storage' tab (Firefox)
4. Expand the 'Cookies' section
5. Select the betterstacks.com domain
6. Find the 'gqlToken' cookie
7. Copy the cookie value
      `}
      actions={
        <ActionPanel>
          <Action title="Set New Token" icon={Icon.Key} onAction={() => setShowingSetup(true)} />
          <Action
            title="Close"
            icon={Icon.XMarkCircle}
            onAction={pop}
            shortcut={{ modifiers: ["cmd"], key: "escape" }}
          />
        </ActionPanel>
      }
    />
  );
}

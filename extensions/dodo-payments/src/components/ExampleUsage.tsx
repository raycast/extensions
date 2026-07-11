import React from "react";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { useAuth } from "../contexts/AuthContext";

/**
 * Example component showing how to use the authentication context
 * This demonstrates accessing auth config and making authenticated API calls
 */
export function ExampleUsage() {
  const { config, isAuthenticated, isLoading, error, authenticatedFetch, refreshAuth } = useAuth();

  if (isLoading) {
    return <Detail markdown="Loading authentication..." />;
  }

  if (!isAuthenticated || error) {
    return <Detail markdown={`Authentication Error: ${error}`} />;
  }

  const handleApiCall = async () => {
    try {
      const response = await authenticatedFetch("/example-endpoint");
      const data = await response.json();
      console.log("API Response:", data);
    } catch (err) {
      console.error("API call failed:", err);
    }
  };

  const markdown = `
# Authentication Status

✅ **Authenticated Successfully**

## Current Configuration

- **API Mode**: ${config?.mode}
- **Base URL**: ${config?.baseUrl}
- **API Key**: ${config?.apiKey ? "••••••••" + config.apiKey.slice(-4) : "Not set"}

## Available Methods

### useAuth Hook Returns:

- \`config\`: Current authentication configuration
- \`isAuthenticated\`: Boolean indicating auth status
- \`isLoading\`: Boolean indicating if auth is being loaded
- \`error\`: Error message if authentication failed
- \`authenticatedFetch\`: Pre-configured fetch function with auth headers
- \`refreshAuth\`: Function to reload authentication configuration

### Example Usage:

\`\`\`typescript
import { useAuth } from "../contexts/AuthContext";

function MyComponent() {
  const { config, authenticatedFetch } = useAuth();
  
  const fetchData = async () => {
    const response = await authenticatedFetch("/api/endpoint");
    const data = await response.json();
    return data;
  };
  
  return <div>API Mode: {config?.mode}</div>;
}
\`\`\`

### Higher-Order Components:

\`\`\`typescript
import { withAuth, withAuthGuard } from "../contexts/AuthContext";

// Wrap your component with authentication
export default withAuth(withAuthGuard(MyComponent));
\`\`\`
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Test Api Call" onAction={handleApiCall} />
          <Action title="Refresh Authentication" onAction={refreshAuth} />
        </ActionPanel>
      }
    />
  );
}

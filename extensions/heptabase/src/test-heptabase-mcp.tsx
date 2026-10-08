import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getHeptabaseMCPClient, MCPTool } from "./heptabase-mcp-client";
import { authorize, getAccessToken, forceRefreshToken } from "./heptabase-oauth";

/**
 * Decode JWT payload (without verification - just for reading claims)
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Get user info from the access token
 */
async function getUserInfo(): Promise<{
  userId?: string;
  email?: string;
  name?: string;
  rawPayload?: Record<string, unknown>;
} | null> {
  try {
    const token = await getAccessToken();

    const payload = decodeJwtPayload(token);
    if (payload) {
      return {
        userId: payload.sub as string | undefined,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        rawPayload: payload,
      };
    }
    return null;
  } catch (e) {
    console.error("Failed to get user info:", e);
    return null;
  }
}

/**
 * Test Heptabase MCP Connection
 * List all available tools
 */
export default function TestHeptabaseMCP() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [userInfo, setUserInfo] = useState<{
    userId?: string;
    email?: string;
    name?: string;
    rawPayload?: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    async function loadTools() {
      try {
        setIsLoading(true);
        setError(null);

        // Ensure authorized
        await authorize();

        // Get user info
        const info = await getUserInfo();
        setUserInfo(info);

        // Get MCP client
        const client = getHeptabaseMCPClient();

        // Test initialization (optional)
        try {
          await client.initialize();
        } catch {
          // Continue execution, some servers may not require initialize
        }

        // List all tools
        const toolsList = await client.listTools();
        setTools(toolsList);

        await showToast({
          style: Toast.Style.Success,
          title: "Connection successful",
          message: `Found ${toolsList.length} tools`,
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(errorMessage);
        console.error("Error loading tools:", e);

        await showToast({
          style: Toast.Style.Failure,
          title: "Connection failed",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadTools();
  }, [retryCount]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Heptabase tools...">
      {error ? (
        <List.EmptyView
          title="Connection failed"
          description={error}
          icon={{ source: "❌" }}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => {
                  // Trigger reload by incrementing retryCount
                  setRetryCount((prev) => prev + 1);
                }}
              />
            </ActionPanel>
          }
        />
      ) : tools.length === 0 ? (
        <List.EmptyView
          title="No tools found"
          description="Heptabase MCP did not provide any tools"
          icon={{ source: "🔍" }}
        />
      ) : (
        <>
          {userInfo && (
            <List.Section title="OAuth Token Info">
              <List.Item
                key="__user_id__"
                title="👤 User ID (sub)"
                subtitle={userInfo.userId || "Not in token"}
                accessories={[{ text: userInfo.email || "" }]}
                actions={
                  <ActionPanel>
                    {userInfo.userId && <Action.CopyToClipboard title="Copy User ID" content={userInfo.userId} />}
                    {userInfo.email && <Action.CopyToClipboard title="Copy Email" content={userInfo.email} />}
                    {userInfo.rawPayload && (
                      <Action.CopyToClipboard
                        title="Copy Full JWT Payload (JSON)"
                        content={JSON.stringify(userInfo.rawPayload, null, 2)}
                      />
                    )}
                  </ActionPanel>
                }
              />
              {userInfo.rawPayload && (
                <List.Item
                  key="__jwt_payload__"
                  title="🔐 JWT Payload"
                  subtitle={`${Object.keys(userInfo.rawPayload).length} claims: ${Object.keys(userInfo.rawPayload).slice(0, 5).join(", ")}...`}
                  accessories={[{ text: "View all claims" }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Full JWT Payload (JSON)"
                        content={JSON.stringify(userInfo.rawPayload, null, 2)}
                      />
                    </ActionPanel>
                  }
                />
              )}
              <List.Item
                key="__force_refresh__"
                title="🔄 Force Refresh Token"
                subtitle="Test if refresh token works"
                accessories={[{ text: "Action" }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Force Refresh Token"
                      onAction={async () => {
                        await showToast({ style: Toast.Style.Animated, title: "Refreshing token..." });
                        const result = await forceRefreshToken();
                        if (result.success) {
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Token Refreshed!",
                            message: result.message,
                          });
                          // Reload to show new token info
                          setRetryCount((prev) => prev + 1);
                        } else {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Refresh Failed",
                            message: result.message,
                          });
                        }
                      }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title={`Tools (${tools.length})`}>
            <List.Item
              key="__copy_all__"
              title="📋 Copy All Tools"
              subtitle={`Copy all ${tools.length} tools as JSON`}
              accessories={[{ text: "Action" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy All Tools (JSON)" content={JSON.stringify(tools, null, 2)} />
                  <Action.CopyToClipboard title="Copy Tool Names Only" content={tools.map((t) => t.name).join("\n")} />
                </ActionPanel>
              }
            />
            {tools.map((tool) => (
              <List.Item
                key={tool.name}
                title={tool.name}
                subtitle={tool.description || "No description"}
                accessories={[{ text: "Tool" }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Tool Name" content={tool.name} />
                    <Action.CopyToClipboard
                      title="Copy Full Info"
                      content={JSON.stringify(tool, null, 2)}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

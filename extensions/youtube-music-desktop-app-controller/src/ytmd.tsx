import { Action, ActionPanel, List, open, Clipboard, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAuthToken, requestAuthCode } from "./utils";

export default function Command() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authCode, setAuthCode] = useState<string | null>(null);

  const startAuthProcess = async () => {
    try {
      setIsAuthenticating(true);
      await requestAuthCode();
    } finally {
      setIsAuthenticating(false);
      const authCode = await getAuthToken();
      setAuthCode(authCode);
    }
  };

  useEffect(() => {
    const fetchAuthToken = async () => {
      const token = await getAuthToken();
      setAuthCode(token);
    };

    fetchAuthToken();
  }, []);

  return (
    <List isLoading={isAuthenticating}>
      <List.Item
        title={authCode ? "Refresh Auth Token" : "Set Auth Token"}
        accessories={[{ icon: isAuthenticating ? "🔄" : "🔑" }]}
        actions={
          <ActionPanel>
            <Action title="Start Authentication Process" onAction={startAuthProcess} />
          </ActionPanel>
        }
      />
      {authCode && (
        <List.Item
          title="Authentication Token"
          accessoryTitle={authCode.slice(0, 10) + "..." + authCode.slice(-10)}
          actions={
            <ActionPanel>
              <Action
                title="Copy Token"
                onAction={async () => {
                  await Clipboard.copy(authCode);
                  await showToast({ style: Toast.Style.Success, title: "Token copied to clipbopard" });
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

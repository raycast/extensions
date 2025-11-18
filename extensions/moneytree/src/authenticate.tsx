import { Form, ActionPanel, Action, showToast, Toast, Icon, Clipboard, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAuthorizationUrl, authenticateWithCode, extractCodeFromUrl, logout, isAuthenticated } from "./lib/auth";

export default function Command() {
  const [authorizationUrl, setAuthorizationUrl] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    async function checkAuth() {
      const isAuth = await isAuthenticated();
      console.debug(`[Authenticate] Authentication check: ${isAuth}`);
      setAuthenticated(isAuth);
    }
    checkAuth();
  }, []);

  async function handleCopyUrl() {
    try {
      if (!authorizationUrl) {
        const url = await getAuthorizationUrl();
        setAuthorizationUrl(url);
        await Clipboard.copy(url);
      } else {
        await Clipboard.copy(authorizationUrl);
      }
      await showToast({
        style: Toast.Style.Success,
        title: "URL copied",
        message: "Authorization URL copied to clipboard",
      });
      // Close the command and return to Raycast menu
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy URL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleLogout() {
    try {
      await logout();
      // Verify logout was successful
      const isAuth = await isAuthenticated();
      if (isAuth) {
        throw new Error("Tokens were not cleared properly");
      }
      setAuthenticated(false);
      setAuthorizationUrl("");
      setCode("");
      await showToast({
        style: Toast.Style.Success,
        title: "Logged out",
        message: "All authentication tokens have been cleared",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleSubmit(values: { code: string; url?: string }) {
    try {
      let authCode = values.code.trim();

      // If user pasted a full URL, extract the code
      if (authCode.includes("?code=") || authCode.includes("&code=")) {
        const extractedCode = extractCodeFromUrl(authCode);
        if (extractedCode) {
          authCode = extractedCode;
        } else {
          throw new Error("Could not extract authorization code from URL");
        }
      }

      if (!authCode) {
        throw new Error("Authorization code is required");
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Authenticating...",
        message: "Exchanging authorization code for tokens",
      });

      await authenticateWithCode(authCode);
      setAuthenticated(true);
      setCode(""); // Clear the code field

      await showToast({
        style: Toast.Style.Success,
        title: "Authentication successful",
        message: "Your Moneytree account is now connected",
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {!authenticated ? (
            <>
              <Action.SubmitForm icon={Icon.Checkmark} title="Authenticate" onSubmit={handleSubmit} />
              <Action
                icon={Icon.Clipboard}
                title="Copy Authorization URL"
                onAction={handleCopyUrl}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          ) : (
            <Action icon={Icon.XMarkCircle} title="Logout" onAction={handleLogout} />
          )}
        </ActionPanel>
      }
    >
      {authenticated ? (
        <Form.Description title="Status" text="✓ You are authenticated." />
      ) : (
        <>
          <Form.Description
            title="Instructions"
            text="1. Execute 'Copy Authorization URL' to copy the authorization URL to your clipboard
2. Open an incognito browser window and access the URL
3. Open the network tab in the developer tools and type 'code' in the filter
4. Login and you'll see a request containing something like '?code=XXX&'
5. Copy and paste the code in the field below and submit"
          />
          <Form.TextField
            id="code"
            title="Authorization Code"
            placeholder="Paste the code from the redirect URL here"
            value={code}
            onChange={setCode}
          />
        </>
      )}
    </Form>
  );
}

import { ActionPanel, Action, Detail, showToast, Toast, open, Icon, Form } from "@raycast/api";
import { useState, useEffect } from "react";
import { logout, isAuthenticated, getUserInfo, setManualAuthTokens } from "./utils/auth";

export default function Login() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{ username?: string } | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        setIsUserAuthenticated(true);
        const userDetails = await getUserInfo();
        setUserInfo(userDetails);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logout();
      setIsUserAuthenticated(false);
      setUserInfo(null);

      await showToast({
        style: Toast.Style.Success,
        title: "Successfully logged out",
      });
    } catch (error) {
      console.error("Logout error:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Logout failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function navigateToSearchResources() {
    await open("raycast://extensions/sourabh_rathour/stacks/search-resources");
  }

  function handleManualTokenSubmit(values: { token: string; username: string }) {
    setIsLoading(true);
    setManualAuthTokens(values.token, values.username)
      .then(() => {
        setIsUserAuthenticated(true);
        setUserInfo({ username: values.username });
        setShowTokenForm(false);
      })
      .catch((error) => {
        setError(`Failed to set token: ${error instanceof Error ? error.message : String(error)}`);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to set token",
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  if (showTokenForm) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save Token" onSubmit={handleManualTokenSubmit} />
            <Action title="Cancel" onAction={() => setShowTokenForm(false)} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="token"
          title="Authentication Token"
          placeholder="Enter your authentication token"
          info="Enter the token from your Stacks account"
        />
        <Form.TextField
          id="username"
          title="Username"
          placeholder="Enter your username"
          info="Enter your Stacks username"
        />
      </Form>
    );
  }

  const getMarkdown = () => {
    if (isUserAuthenticated) {
      return `
# 🎉 You are logged in to Stacks!

![Stacks Logo](https://betterstacks.com/favicon.ico)

## Account Information
- **Username**: ${userInfo?.username || "Unknown"}
- **Status**: Active

## What's Next?
You can now access all your saved resources. Use the "Search Resources" action below to start exploring your content.

## Need Help?
Visit [betterstacks.com](https://betterstacks.com) for more information or to contact support.
      `;
    } else {
      return `
# Login to Stacks

![Stacks Logo](https://betterstacks.com/favicon.ico)

## Authentication Notice

**Important:** Due to Firebase authentication limitations in Raycast extensions, we need to use a manual token approach.

## How to Login:

1. Click the "Enter Authentication Token" button below
2. Enter your authentication token and username
3. You can get your token from the Stacks website by following these steps:
   - Login to [betterstacks.com](https://betterstacks.com)
   - Open browser developer tools (F12 or right-click > Inspect)
   - Go to Application tab > Local Storage > betterstacks.com
   - Find the "gqlToken" key and copy its value

${error ? `\n## Status\n**${error}**\n\nPlease follow the instructions above to authenticate.\n` : ""}

## Technical Details

Firebase authentication popup windows are not supported in Raycast extensions. We're using a manual token approach as a workaround.
      `;
    }
  };

  return (
    <Detail
      markdown={getMarkdown()}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {isUserAuthenticated ? (
            <>
              <Action title="Search Resources" icon={Icon.MagnifyingGlass} onAction={navigateToSearchResources} />
              <Action title="Logout" icon={Icon.Logout} onAction={handleLogout} />
              <Action.OpenInBrowser title="Visit Stacks Website" url="https://betterstacks.com" />
            </>
          ) : (
            <>
              <Action title="Enter Authentication Token" icon={Icon.Key} onAction={() => setShowTokenForm(true)} />
              <Action title="Check Authentication Status" icon={Icon.ArrowClockwise} onAction={checkAuthStatus} />
              <Action.OpenInBrowser title="Visit Stacks Website" icon={Icon.Globe} url="https://betterstacks.com" />
            </>
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Extension" text="Stacks" />
          <Detail.Metadata.Label title="Status" text={isUserAuthenticated ? "Logged In" : "Not Logged In"} />
          {isUserAuthenticated && userInfo?.username && (
            <Detail.Metadata.Label title="Username" text={userInfo.username} />
          )}
        </Detail.Metadata>
      }
    />
  );
}

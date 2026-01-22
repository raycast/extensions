import {
  showToast,
  Toast,
  open,
  showHUD,
  confirmAlert,
  Alert,
  Form,
  ActionPanel,
  Action,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { storeTokens, clearTokens } from "./api";

// Since Logos uses OAuth 1.0a with a server-side component we can't replicate,
// we use a cookie/session-based approach where users extract their session from the browser.

const LOGIN_INSTRUCTIONS = `
To login, extract the "auth" cookie from the Logos web app:

1. Open Chrome and go to https://app.logos.com
2. Login to your Faithlife account if needed
3. Open DevTools (Cmd+Option+I) → Application tab
4. Under Storage → Cookies → app.logos.com
5. Find the cookie named "auth" (should be ~312 characters)
6. Double-click the Value cell to select it, then copy (Cmd+C)
7. Paste the value below
`;

export default function Command() {
  const [sessionToken, setSessionToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!sessionToken.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Token Required",
        message: "Please enter a session token",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store the token
      await storeTokens({
        accessToken: sessionToken.trim(),
        accessTokenSecret: "", // Not used in session-based auth
      });

      // Test if it works by making a simple API call
      const testResponse = await fetch("https://app.logos.com/api/app/notes-api/notes/find", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Origin: "https://app.logos.com",
          Referer: "https://app.logos.com/tools/notes",
          Cookie: `auth=${sessionToken.trim()}`,
        },
        body: JSON.stringify({
          request: {
            noteLimit: 1,
            facets: [{ field: "noteKind" }],
            noteTotalField: true,
            noteFields: ["id", "noteKind"],
            tzoMinutes: new Date().getTimezoneOffset(),
            userLanguage: "en-US",
          },
        }),
      });

      if (testResponse.ok) {
        await showHUD("✓ Successfully logged in to Faithlife");
        await popToRoot();
      } else if (testResponse.status === 401 || testResponse.status === 403) {
        await clearTokens();
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Token",
          message: "The token was rejected. Please try again with a fresh token.",
        });
      } else {
        // Token might still work, store it and let user try
        await showToast({
          style: Toast.Style.Success,
          title: "Token Saved",
          message: "Try syncing your notes to verify it works.",
        });
        await popToRoot();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Login Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOpenWebApp() {
    await open("https://app.logos.com");
  }

  async function handleLogout() {
    const confirmed = await confirmAlert({
      title: "Logout",
      message: "Are you sure you want to logout?",
      primaryAction: {
        title: "Logout",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearTokens();
      await showHUD("✓ Logged out");
      setSessionToken("");
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Token" onSubmit={handleSubmit} />
          <Action title="Open Logos Web App" onAction={handleOpenWebApp} />
          <Action
            title="Logout"
            style={Action.Style.Destructive}
            onAction={handleLogout}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Login to Faithlife" text={LOGIN_INSTRUCTIONS} />

      <Form.Separator />

      <Form.TextField
        id="sessionToken"
        title="Session Token"
        placeholder="Paste your session token here..."
        value={sessionToken}
        onChange={setSessionToken}
      />

      <Form.Description
        title="Note"
        text="Session tokens expire after some time. If syncing stops working, you may need to re-login."
      />
    </Form>
  );
}

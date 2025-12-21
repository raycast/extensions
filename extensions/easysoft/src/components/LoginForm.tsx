import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getCSRFToken, login } from "../api/auth";
import { getSubjects } from "../api/tests";
import { getBackendUrl } from "../config";

interface LoginFormProps {
  onLoginSuccess: () => void;
  onManualSession: () => void;
}

interface FormValues {
  username: string;
  password: string;
}

export function LoginForm({ onLoginSuccess, onManualSession }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    const { username, password } = values;
    console.log("[LOGIN_FORM] Form submitted for user:", username);

    if (!username || !password) {
      console.warn("[LOGIN_FORM] Missing username or password");
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter both username and password",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Validate backend URL first
      const backendUrl = getBackendUrl();
      if (!backendUrl || (!backendUrl.startsWith("http://") && !backendUrl.startsWith("https://"))) {
        throw new Error(
          "Backend URL is not configured. Please set it in Raycast preferences (⌘, then Extensions > easySoft > Preferences).",
        );
      }

      console.log("[LOGIN_FORM] Step 1: Getting CSRF token...");
      // Get CSRF token first (this also stores it for cookie sending)
      const csrfToken = await getCSRFToken();
      console.log("[LOGIN_FORM] Step 2: CSRF token obtained, attempting login...");

      // Perform login - this will try to extract JSESSIONID from Set-Cookie header
      const loginResult = await login(username, password, csrfToken);
      console.log("[LOGIN_FORM] Step 3: Login completed, sessionId extracted:", !!loginResult.sessionId);

      // If we got a session ID from the response, verify it works
      if (loginResult.sessionId) {
        console.log("[LOGIN_FORM] Step 4a: Verifying extracted session ID...");
        try {
          await getSubjects();
          console.log("[LOGIN_FORM] Step 5: Session verification successful!");
          await showToast({
            style: Toast.Style.Success,
            title: "Success",
            message: "Logged in successfully",
          });
          onLoginSuccess();
          return;
        } catch (verifyError) {
          // Session ID was extracted but doesn't work - might be invalid
          console.error("[LOGIN_FORM] Session verification failed:", verifyError);
        }
      }

      // If we couldn't extract session ID or verification failed,
      // try to verify if cookies work by making a test call
      console.log("[LOGIN_FORM] Step 4b: Verifying session via cookie...");
      try {
        await getSubjects();
        // If this works, cookies are working and session is set
        console.log("[LOGIN_FORM] Step 5: Cookie-based session verification successful!");
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Logged in successfully",
        });
        onLoginSuccess();
      } catch (verifyError) {
        // Session might not be accessible via cookie in Raycast
        // Suggest manual entry (as per memory - this is the best approach for Raycast)
        console.error("[LOGIN_FORM] Session verification failed, prompting for manual entry:", verifyError);
        await showToast({
          style: Toast.Style.Failure,
          title: "Session Not Accessible",
          message: "Login succeeded but session cookie not accessible in Raycast. Please use manual session entry.",
        });
        onManualSession();
      }
    } catch (error) {
      console.error("[LOGIN_FORM] Login error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Login Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Login" onSubmit={handleSubmit} />
          <Action title="Enter Session Manually" onAction={onManualSession} />
        </ActionPanel>
      }
    >
      <Form.TextField id="username" title="Username" placeholder="Enter your username" defaultValue="" autoFocus />
      <Form.PasswordField id="password" title="Password" placeholder="Enter your password" defaultValue="" />
      <Form.Description
        title="Alternative"
        text="If login doesn't work, you can manually enter your JSESSIONID from SchoolSoft."
      />
    </Form>
  );
}

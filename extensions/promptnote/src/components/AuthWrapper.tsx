import {
  List,
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  isAuthenticated,
  loginWithEmail,
  logout,
  ensureAuthenticated,
} from "../lib/supabase";
import { CREATE_ACCOUNT_URL, WEB_APP_URL } from "../lib/config";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check if tokens exist
      const authenticated = await isAuthenticated();

      if (authenticated) {
        // Proactively refresh tokens if expired or about to expire
        // This ensures fresh tokens on every extension launch
        try {
          await ensureAuthenticated();
          setIsLoggedIn(true);
        } catch (refreshError) {
          // Token refresh failed - likely refresh token is invalid
          // User needs to re-authenticate
          console.error("Token refresh failed:", refreshError);
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsLoggedIn(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return <List isLoading navigationTitle="Checking authentication..." />;
  }

  if (!isLoggedIn) {
    if (showLoginForm) {
      return (
        <LoginForm
          onSuccess={() => setIsLoggedIn(true)}
          onCancel={() => setShowLoginForm(false)}
        />
      );
    }

    return (
      <List
        navigationTitle="Welcome to PromptNote"
        searchBarPlaceholder="Search login methods..."
      >
        <List.EmptyView
          title="Welcome to PromptNote"
          description="Log in with your account to access your notes and snippets."
          icon={Icon.AppWindow}
        />

        <List.Item
          title="Log In with Email"
          subtitle="Use your email and password"
          icon={Icon.Envelope}
          actions={
            <ActionPanel>
              <Action
                title="Log in with Email"
                icon={Icon.Envelope}
                onAction={() => setShowLoginForm(true)}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Set Password on Web"
          subtitle="For Google/GitHub users — set a password to use here"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Set Password on Web"
                url={`${WEB_APP_URL}/?action=set-password`}
                icon={Icon.Key}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Create Account"
          subtitle="Sign up at PromptNote"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Create Account"
                url={CREATE_ACCOUNT_URL}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <>{children}</>;
}

interface LoginFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function LoginForm({ onSuccess, onCancel }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { email: string; password: string }) => {
    if (!values.email.trim() || !values.password.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Email and password are required",
      });
      return;
    }

    setIsLoading(true);

    try {
      await loginWithEmail(values.email.trim(), values.password);

      await showToast({
        style: Toast.Style.Success,
        title: "Logged in successfully",
      });

      onSuccess();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Log In to PromptNote"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Log In"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Login"
        text="Enter your credentials, then press Cmd+Enter to log in."
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="your@email.com"
        autoFocus
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Your password"
      />
    </Form>
  );
}

/**
 * Hook to handle logout
 * Always shows success since logout() is now robust and handles errors internally
 */
export function useLogout() {
  return async () => {
    try {
      await logout();
    } catch (error) {
      // Logout is now robust, but log any unexpected errors
      console.error("Unexpected logout error:", error);
    }
    // Always show success - local tokens are cleared regardless
    await showToast({
      style: Toast.Style.Success,
      title: "Logged out",
      message: "Restart extension to log in again",
    });
  };
}

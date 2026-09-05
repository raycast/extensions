import { Action, ActionPanel, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { AuthStatus, getInitialAuthStatus, resolveAuthStatus, signInWithCodexAuth } from "../utils/auth";
import { getErrorMessage } from "../utils/error";

interface AuthRequiredViewProps {
  title?: string;
  description?: string;
  allowChatGPTSignIn?: boolean;
  onAuthChange?: () => void;
}

interface AuthGateProps extends AuthRequiredViewProps {
  requireApiKey?: boolean;
  children: ReactNode;
}

export function AuthGate({
  children,
  requireApiKey = false,
  title,
  description,
  allowChatGPTSignIn = true,
}: AuthGateProps) {
  const [auth, setAuth] = useState<AuthStatus>(() => getInitialAuthStatus());
  const [isLoading, setLoading] = useState<boolean>(() => !getInitialAuthStatus().hasApiKey);

  const refreshAuth = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    const status = await resolveAuthStatus();
    setAuth(status);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAuth(false);
  }, [refreshAuth]);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  const hasAccess = requireApiKey ? auth.hasApiKey : auth.provider !== "none";

  if (!hasAccess) {
    return (
      <AuthRequiredView
        title={title}
        description={description}
        allowChatGPTSignIn={requireApiKey ? false : allowChatGPTSignIn}
        onAuthChange={() => refreshAuth(true)}
      />
    );
  }

  return <>{children}</>;
}

export function AuthRequiredView({
  title = "Sign-in Required",
  description = "Use your API key or sign in with ChatGPT to continue.",
  allowChatGPTSignIn = true,
  onAuthChange,
}: AuthRequiredViewProps) {
  const [isLoading, setLoading] = useState(false);

  async function handleChatGPTSignIn() {
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening ChatGPT sign-in via Codex...",
    });

    try {
      await signInWithCodexAuth();
      toast.style = Toast.Style.Success;
      toast.title = "Signed in with ChatGPT";
      toast.message = "You can continue in Raycast now.";
      onAuthChange?.();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sign-in failed";
      toast.message = getErrorMessage(error, "Could not complete ChatGPT sign-in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {allowChatGPTSignIn && (
            <Action icon={Icon.TwoPeople} title="Sign in with ChatGPT" onAction={handleChatGPTSignIn} />
          )}
          <Action icon={Icon.Key} title="Use API Key" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <List.EmptyView icon={Icon.Lock} title={title} description={description} />
    </List>
  );
}

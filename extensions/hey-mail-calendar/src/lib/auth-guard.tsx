import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { ReactNode } from "react";
import { clearAuthVerified, isAuthCached, markAuthVerified } from "./auth-cache";
import { getAuthStatus, getHeyPath, loginHey } from "./hey";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, data, error, revalidate } = usePromise(async () => {
    if (await isAuthCached()) {
      return {
        authenticated: true,
        path: getHeyPath(),
        summary: "Using cached session",
        cached: true,
      };
    }

    const auth = await getAuthStatus();
    const authenticated = Boolean(auth.status.authenticated && !auth.status.expired);

    if (authenticated) {
      await markAuthVerified();
    }

    return {
      authenticated,
      path: auth.path,
      summary: auth.summary ?? (authenticated ? "Logged in" : "Not logged in"),
      cached: false,
      expired: auth.status.expired,
    };
  });

  if (isLoading) {
    return <List isLoading />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# HEY CLI Error\n\n${error.message}\n\n**Tip:** Open Raycast Preferences → Extensions → HEY and set **hey CLI Path** to the output of \`which hey\` in Terminal.\n\nCommon paths:\n- \`/usr/local/bin/hey\`\n- \`/opt/homebrew/bin/hey\``}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
    );
  }

  if (!data?.authenticated) {
    const summary = data?.summary ?? "Not logged in";
    const path = data?.path ?? "unknown";

    return (
      <Detail
        markdown={`# Sign in to HEY\n\n**CLI path:** \`${path}\`\n**Status:** ${summary}\n\nLog in once here and other HEY commands should work for 24 hours without asking again.\n\n1. Confirm \`which hey\` in Terminal matches the path above\n2. Use **Log in With Hey CLI** below\n3. Press **Retry** if needed`}
        actions={
          <ActionPanel>
            <Action
              title="Log in with Hey CLI"
              icon={Icon.Key}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Opening HEY login…" });
                try {
                  await loginHey();
                  await markAuthVerified();
                  toast.style = Toast.Style.Success;
                  toast.title = "Logged in";
                  revalidate();
                } catch (loginError) {
                  await clearAuthVerified();
                  toast.style = Toast.Style.Failure;
                  toast.title = "Login failed";
                  toast.message = loginError instanceof Error ? loginError.message : "Unknown error";
                }
              }}
            />
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            <Action.CopyToClipboard
              title="Copy Diagnostic Info"
              content={`hey path: ${path}\nauth summary: ${summary}\nauthenticated: ${String(data?.authenticated)}\ncached: ${String(data?.cached)}`}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <>{children}</>;
}

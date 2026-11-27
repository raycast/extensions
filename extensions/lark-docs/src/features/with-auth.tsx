import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { useIsAuthenticated } from "../hooks/auth-state";
import { applyLoginCookies, restoreSession } from "../services/client";
import { DOMAIN } from "../utils/config";
import { QRLogin } from "./qr-login";

function AuthGuard({ children }: React.PropsWithChildren) {
  const authenticated = useIsAuthenticated();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    restoreSession().finally(() => setChecked(true));
  }, []);

  const handleLogin = async (cookies: string[]) => {
    await applyLoginCookies(cookies);
  };

  if (!DOMAIN) {
    return (
      <Detail
        markdown="## Configure your domain\n\nChoose a deployment type and provide the self-hosted domain in extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (!checked) return <Detail isLoading markdown="" />;
  if (!authenticated) return <QRLogin onConfirm={handleLogin} />;
  return children;
}

export const withAuth =
  <T extends Record<string, unknown>>(Component: React.ComponentType<T>) =>
  (props: T) => (
    <AuthGuard>
      <Component {...props} />
    </AuthGuard>
  );

import { List, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { useMfaSession, ROLES, RoleId, runAwsAuth, getAuthErrorMessage } from "../hooks/use-mfa-session";

interface MfaPromptProps {
  roleId: RoleId;
  onSuccess: () => void;
}

export function MfaPrompt({ roleId, onSuccess }: MfaPromptProps) {
  const { revalidate } = useMfaSession();
  const role = ROLES.find((r) => r.id === roleId);

  useEffect(() => {
    async function authenticate() {
      try {
        await runAwsAuth(roleId);
        await revalidate();
        showToast(Toast.Style.Success, `Authenticated to ${role?.accountName}`);
        onSuccess();
      } catch (error) {
        showToast(Toast.Style.Failure, "Authentication failed", getAuthErrorMessage(error));
      }
    }
    authenticate();
  }, []);

  return <List isLoading={true} navigationTitle={`Authenticating: ${role?.name}`} />;
}

export function useMfaGuard() {
  const { isValid, isLoading, activeRole, revalidate } = useMfaSession();

  const needsMfa = !isLoading && !isValid;

  return {
    isValid,
    isLoading,
    activeRole,
    revalidate,
    needsMfa,
  };
}

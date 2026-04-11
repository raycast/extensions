import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { useMfaSession, ROLES, RoleId, runAwsAuth, getAuthErrorMessage } from "./hooks/use-mfa-session";
import { useState } from "react";

export default function MfaSession() {
  const { isLoading, roleStatuses, revalidate, activeRole, setActiveRole } = useMfaSession();
  const [authenticatingRole, setAuthenticatingRole] = useState<string | null>(null);

  async function authenticate(roleId: RoleId) {
    const role = ROLES.find((r) => r.id === roleId);
    setAuthenticatingRole(role?.name ?? null);
    try {
      await runAwsAuth(roleId);
      await revalidate();
      showToast(Toast.Style.Success, `Authenticated to ${role?.accountName}`);
    } catch (error) {
      showToast(Toast.Style.Failure, "Authentication failed", getAuthErrorMessage(error));
    } finally {
      setAuthenticatingRole(null);
    }
  }

  if (isLoading || authenticatingRole !== null) {
    return (
      <List
        isLoading={true}
        navigationTitle={authenticatingRole ? `Authenticating: ${authenticatingRole}` : undefined}
      />
    );
  }

  return (
    <List searchBarPlaceholder="Select an AWS account/role">
      {roleStatuses.map((role) => (
        <List.Item
          key={role.id}
          icon={
            role.isValid
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.XMarkCircle, tintColor: Color.Red }
          }
          title={role.name}
          subtitle={`${role.accountName} (${role.account})`}
          accessories={[
            role.id === activeRole ? { tag: { value: "Active", color: Color.Blue }, icon: Icon.Star } : {},
            role.isValid
              ? { text: role.timeRemaining, icon: Icon.Clock }
              : { text: "Expired", icon: { source: Icon.Clock, tintColor: Color.Red } },
          ]}
          actions={
            <ActionPanel>
              {role.isValid ? (
                <>
                  <Action
                    title="Set as Active"
                    icon={Icon.Star}
                    onAction={() => {
                      setActiveRole(role.id);
                      showToast(Toast.Style.Success, `Switched to ${role.accountName}`);
                    }}
                  />
                  <Action title="Re-authenticate" icon={Icon.Key} onAction={() => authenticate(role.id)} />
                </>
              ) : (
                <Action title="Authenticate" icon={Icon.Key} onAction={() => authenticate(role.id)} />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

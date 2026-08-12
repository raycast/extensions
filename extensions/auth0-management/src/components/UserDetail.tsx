import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Organization, Role, Tenant, User } from "../utils/types";
import { getUserOrganizations, getUserRoles } from "../utils/auth0-client";
import { escapeTableCell, formatDateTime, buildUserDashboardUrl } from "../utils/formatting";
import UserLogsDetail from "./UserLogsDetail";

interface UserDetailProps {
  user: User;
  tenant: Tenant;
}

/** Detail view showing a user's full profile, identities, roles, and organization memberships. */
export default function UserDetail({ user, tenant }: UserDetailProps) {
  const { data, isLoading } = usePromise(
    async (t, uid) => {
      const [orgs, roles] = await Promise.all([getUserOrganizations(t, uid), getUserRoles(t, uid)]);
      return { organizations: orgs, roles };
    },
    [tenant, user.user_id],
  );

  const organizations: Organization[] = data?.organizations ?? [];
  const roles: Role[] = data?.roles ?? [];

  const identities =
    user.identities && user.identities.length > 0
      ? user.identities
          .map(
            (id) =>
              `${escapeTableCell(id.provider)} ${escapeTableCell(id.connection)}${id.isSocial ? " (Social)" : ""}`,
          )
          .join(", ")
      : "None";

  let rolesSection: string;
  if (isLoading) {
    rolesSection = "Loading...";
  } else if (roles.length > 0) {
    rolesSection = roles
      .map((role) => `- **${role.name}**${role.description ? ` — ${role.description}` : ""} (\`${role.id}\`)`)
      .join("\n");
  } else {
    rolesSection = "None";
  }

  let orgsSection: string;
  if (isLoading) {
    orgsSection = "Loading...";
  } else if (organizations.length > 0) {
    orgsSection = organizations.map((org) => `- ${org.display_name || org.name} (\`${org.id}\`)`).join("\n");
  } else {
    orgsSection = "None";
  }

  const markdown = `# ${user.name || user.email}

${user.picture ? `![Avatar](${user.picture})` : ""}

| Field | Value |
|---|---|
| **User ID** | ${escapeTableCell(user.user_id)} |
| **Email** | ${user.email} ${user.email_verified ? "✓" : "(unverified)"} |
| **Name** | ${user.name || "—"} |
| **Nickname** | ${user.nickname || "—"} |
| **Created** | ${formatDateTime(user.created_at, "Never")} |
| **Last Login** | ${formatDateTime(user.last_login, "Never")} |
| **Last IP** | ${user.last_ip || "—"} |
| **Login Count** | ${user.logins_count ?? 0} |
| **Blocked** | ${user.blocked ? "Yes" : "No"} |
| **Identities** | ${identities} |

## Roles

${rolesSection}

## Organizations

${orgsSection}
`;

  const dashboardUrl = buildUserDashboardUrl(tenant.domain, user.user_id);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={user.email}
      actions={
        <ActionPanel>
          <Action.Push title="View Logs" icon={Icon.List} target={<UserLogsDetail user={user} tenant={tenant} />} />
          <Action.CopyToClipboard
            title="Copy User ID"
            content={user.user_id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy Email"
            content={user.email}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
          <Action.OpenInBrowser
            title="Open in Auth0 Dashboard"
            url={dashboardUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy User JSON"
            content={JSON.stringify(user, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

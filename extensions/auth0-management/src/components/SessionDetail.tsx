import { Detail, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  getUserSessions,
  getUserGrants,
  revokeUserSessions,
  revokeGrant,
  getAuth0ErrorMessage,
} from "../utils/auth0-client";
import { Session, Tenant, User, UserGrant } from "../utils/types";
import { escapeTableCell, formatDateTime } from "../utils/formatting";

interface SessionDetailProps {
  user: User;
  tenant: Tenant;
}

/** Detail view showing a user's active sessions and OAuth2 grants, with revocation actions. */
export default function SessionDetail({ user, tenant }: SessionDetailProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [grants, setGrants] = useState<UserGrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionResults, grantResults] = await Promise.all([
        getUserSessions(tenant, user.user_id),
        getUserGrants(tenant, user.user_id),
      ]);
      setSessions(sessionResults);
      setGrants(grantResults);
    } catch (err) {
      const message = getAuth0ErrorMessage(err, "read:users");
      showToast({ style: Toast.Style.Failure, title: "Fetch Failed", message });
    } finally {
      setIsLoading(false);
    }
  }, [tenant, user.user_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevokeSessions = async () => {
    const confirmed = await confirmAlert({
      title: "Revoke All Sessions?",
      message: `This will terminate all active sessions for ${user.email}.`,
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Revoking sessions\u2026" });
      await revokeUserSessions(tenant, user.user_id);
      await showToast({ style: Toast.Style.Success, title: "Sessions Revoked" });
      await fetchData();
    } catch (err) {
      const message = getAuth0ErrorMessage(err, "delete:sessions");
      showToast({ style: Toast.Style.Failure, title: "Revoke Failed", message });
    }
  };

  const handleRevokeGrant = async (grant: UserGrant) => {
    if (!grant.id) return;
    const confirmed = await confirmAlert({
      title: "Revoke Grant?",
      message: `Revoke grant for audience: ${grant.audience || "unknown"}?`,
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Revoking grant\u2026" });
      await revokeGrant(tenant, grant.id);
      await showToast({ style: Toast.Style.Success, title: "Grant Revoked" });
      await fetchData();
    } catch (err) {
      const message = getAuth0ErrorMessage(err, "delete:grants");
      showToast({ style: Toast.Style.Failure, title: "Revoke Failed", message });
    }
  };

  let sessionsSection: string;
  if (sessions.length > 0) {
    const header = "| Session ID | Created | Last Activity | Expires | IP | User Agent |\n|---|---|---|---|---|---|";
    const rows = sessions.map((s) => {
      const ip = s.device?.last_ip || s.device?.initial_ip || "\u2014";
      const ua = s.device?.last_user_agent || s.device?.initial_user_agent || "\u2014";
      const truncatedUa = ua.length > 40 ? ua.substring(0, 40) + "\u2026" : ua;
      return `| ${escapeTableCell(s.id || "\u2014")} | ${formatDateTime(s.created_at)} | ${formatDateTime(s.last_interacted_at)} | ${formatDateTime(s.expires_at)} | ${escapeTableCell(String(ip))} | ${escapeTableCell(truncatedUa)} |`;
    });
    sessionsSection = `${header}\n${rows.join("\n")}`;
  } else {
    sessionsSection = "No active sessions";
  }

  let grantsSection: string;
  if (grants.length > 0) {
    const header = "| Grant ID | Client ID | Audience | Scopes |\n|---|---|---|---|";
    const rows = grants.map((g) => {
      const scopes = g.scope?.join(", ") || "\u2014";
      return `| ${escapeTableCell(g.id || "\u2014")} | ${escapeTableCell(g.clientID || "\u2014")} | ${escapeTableCell(g.audience || "\u2014")} | ${escapeTableCell(scopes)} |`;
    });
    grantsSection = `${header}\n${rows.join("\n")}`;
  } else {
    grantsSection = "No grants";
  }

  const markdown = `# Sessions & Grants for ${user.name || user.email}

## Active Sessions (${sessions.length})

${sessionsSection}

## Grants (${grants.length})

${grantsSection}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Sessions: ${user.email}`}
      actions={
        <ActionPanel>
          {sessions.length > 0 && (
            <Action
              title="Revoke All Sessions"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleRevokeSessions}
            />
          )}
          {grants.map(
            (g) =>
              g.id && (
                <Action
                  key={g.id}
                  title={`Revoke Grant: ${g.audience || g.id}`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRevokeGrant(g)}
                />
              ),
          )}
          <Action.CopyToClipboard
            title="Copy User ID"
            content={user.user_id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchData}
          />
        </ActionPanel>
      }
    />
  );
}

import { ActionPanel, List, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export default function Command() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { "Session Token": sessionToken } = getPreferenceValues();

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("https://logggai.run/api/organizations", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { organizations?: Organization[] };
        setOrgs(data.organizations || []);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch organizations" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrgs();
  }, [sessionToken]);

  async function switchContext(orgId?: string) {
    try {
      await fetch("https://logggai.run/api/user/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ organizationId: orgId || null }),
      });
      showToast({ style: Toast.Style.Success, title: "Context switched!" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to switch context" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Switch context...">
      <List.Item
        key="personal"
        title="Personal Workspace"
        actions={
          <ActionPanel>
            <Action title="Switch to Personal" onAction={() => switchContext()} />
          </ActionPanel>
        }
      />
      {orgs.map((org) => (
        <List.Item
          key={org.id}
          title={org.name}
          subtitle={org.role}
          actions={
            <ActionPanel>
              <Action title={`Switch to ${org.name}`} onAction={() => switchContext(org.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

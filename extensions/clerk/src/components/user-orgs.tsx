import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { OrgMembers } from "./org-members";

export function UserOrgs(props: { app: ClerkApp; userId: string; userLabel: string }) {
  const { data, isLoading } = useCachedPromise(
    async (userId: string) => {
      const res = await clientFor(props.app).users.getOrganizationMembershipList({ userId });
      return res.data;
    },
    [props.userId],
    { onError: showClerkError },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Organizations · ${props.userLabel}`}>
      {(data ?? []).map((m) => (
        <List.Item
          key={m.id}
          icon={Icon.Building}
          title={m.organization.name}
          subtitle={m.organization.slug ?? undefined}
          accessories={[{ tag: m.role }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Members"
                icon={Icon.PersonLines}
                target={<OrgMembers app={props.app} organizationId={m.organization.id} orgName={m.organization.name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

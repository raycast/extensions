import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useTeam } from "./lib/hooks/useTeam";

export default function ViewTeam() {
  return (
    <FeatureGuard feature="team">
      {(apiKey, accountName) => (
        <TeamList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function TeamList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: members, isLoading } = useTeam(apiKey);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search team members..."
    >
      {!isLoading && members && members.length === 0 && (
        <EmptyView
          title="No Team Members"
          description="Your API token may not have access to the team members endpoint"
          icon={Icon.TwoPeople}
        />
      )}
      <List.Section title="Team" subtitle={`${(members ?? []).length} members`}>
        {(members ?? []).map((member) => (
          <List.Item
            key={member.id}
            title={member.email}
            subtitle={member.role}
            icon={{ source: Icon.Person, tintColor: Color.Blue }}
            accessories={[
              {
                tag: {
                  value: member.role,
                  color:
                    member.role === "administrator" ? Color.Red : Color.Blue,
                },
              },
              ...(member.status ? [{ tag: { value: member.status } }] : []),
            ]}
            keywords={[member.email, member.role]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Email"
                  content={member.email}
                />
                <AccountSwitcherActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getOrganizations } from "./utils/buffer-api";

function OrganizationDetail({ organizationId }: { organizationId: string }) {
  const {
    data: organizations,
    isLoading,
    error,
  } = usePromise(getOrganizations);
  const organization = organizations?.find(
    (item) => item.id === organizationId,
  );

  if (error) {
    return <Detail markdown={`## ❌ Error\n\n${error.message}`} />;
  }

  if (!organization) {
    return <Detail isLoading={isLoading} markdown="Organization not found." />;
  }

  const limits = organization.limits;
  const markdown = `
# ${organization.name}

**Owner:** ${organization.ownerEmail || "—"}

**Connected Channels:** ${organization.channelCount ?? "—"}

**Members:** ${organization.members?.totalCount ?? "—"}

## Limits

| Resource | Limit |
|----------|-------|
| Channels | ${limits?.channels ?? "—"} |
| Members | ${limits?.members ?? "—"} |
| Scheduled Posts | ${limits?.scheduledPosts ?? "—"} |
| Ideas | ${limits?.ideas ?? "—"} |
| Tags | ${limits?.tags ?? "—"} |
| Saved Replies | ${limits?.savedReplies ?? "—"} |
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={organization.name}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Organization Id"
            content={organization.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Open Buffer"
            url="https://publish.buffer.com"
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Organizations() {
  const { push } = useNavigation();
  const {
    data: organizations,
    isLoading,
    error,
  } = usePromise(getOrganizations);

  if (error) {
    return (
      <Detail
        markdown={`## ❌ Error\n\n${error.message}\n\nCheck your **Buffer Access Token** in Raycast preferences.`}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Buffer Organizations">
      {(organizations ?? []).map((organization) => (
        <List.Item
          key={organization.id}
          title={organization.name}
          subtitle={organization.ownerEmail}
          accessories={[
            { text: `${organization.channelCount ?? 0} channels` },
            { text: `${organization.members?.totalCount ?? 0} members` },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="View Details"
                icon={Icon.Eye}
                onAction={() =>
                  push(<OrganizationDetail organizationId={organization.id} />)
                }
              />
              <Action.CopyToClipboard
                title="Copy Organization Id"
                content={organization.id}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open Buffer"
                url="https://publish.buffer.com"
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && !(organizations ?? []).length && (
        <List.EmptyView
          title="No organizations found"
          description="Your Buffer account has no organizations available."
          icon={Icon.Person}
        />
      )}
    </List>
  );
}

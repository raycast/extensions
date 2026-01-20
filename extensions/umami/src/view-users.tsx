import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { IS_CLOUD, umami } from "./lib/umami";
import { UmamiAdminUser } from "./lib/types";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import WithUmami from "./components/WithUmami";
import { handleUmamiError } from "./lib/utils";

export default function Main() {
  if (IS_CLOUD)
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Not Allowed"
          description="This method is not available in Umami Cloud"
        />
      </List>
    );

  return (
    <WithUmami>
      <Users />
    </WithUmami>
  );
}

function Users() {
  const { isLoading, data: users = [] } = useCachedPromise(async () => {
    const { ok, error, data } = await umami.get("admin/users");
    if (!ok) handleUmamiError(error);
    const users = data?.data ?? [];
    return users as UmamiAdminUser[];
  });

  return (
    <List isLoading={isLoading}>
      {users.map((user) => (
        <List.Item
          key={user.id}
          icon={user.logoUrl || Icon.Person}
          title={user.username}
          subtitle={user.role}
          accessories={[{ date: new Date(user.createdAt) }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.ArrowRight} title="View Websites" target={<Websites user={user} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Websites({ user }: { user: UmamiAdminUser }) {
  const { isLoading, data: websites = [] } = useCachedPromise(
    async (userId) => {
      const { ok, error, data } = await umami.getWebsites({ userId });
      if (!ok) handleUmamiError(error);
      const websites = data?.data ?? [];
      const endAt = Date.now();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
      const startAt = pastDate.getTime();

      const statsResponses = await Promise.all(
        websites.map((website) => umami.getWebsiteStats(website.id, { startAt, endAt })),
      );
      const stats = statsResponses.map(({ data }) => data);
      return websites.map((website, index) => ({ ...website, stats: stats[index] }));
    },
    [user.id],
  );

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`View Users / ${user.username} / View Websites`}>
      {websites.map((website) => (
        <List.Item
          key={website.id}
          icon={getFavicon(`https://${website.domain}`)}
          title={website.name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {website.stats && (
                    <>
                      <List.Item.Detail.Metadata.Label title="Stats" />
                      <List.Item.Detail.Metadata.Label title="Bounces" text={`${website.stats.bounces.value || 0}`} />
                      <List.Item.Detail.Metadata.Label
                        title="Page Views"
                        text={`${website.stats.pageviews.value || 0}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Time"
                        text={`${website.stats.totaltime.value || 0}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Visitors" text={`${website.stats.visitors.value || 0}`} />
                      <List.Item.Detail.Metadata.Label title="Visits" text={`${website.stats.visits.value || 0}`} />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

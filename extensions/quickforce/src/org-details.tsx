import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getEnhancedOrgDetails, getOrgLimits, getInstalledPackages, getCurrentUserInfo } from "./lib/sfdx";

// Helper functions
function formatLimitName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function getColorForUsage(percent: number): Color {
  if (percent >= 90) return Color.Red;
  if (percent >= 70) return Color.Orange;
  return Color.Green;
}

const PRIORITY_LIMITS = [
  "DailyApiRequests",
  "DataStorageMB",
  "FileStorageMB",
  "DailyAsyncApexExecutions",
  "DailyBulkApiRequests",
  "DailyStreamingApiEvents",
];

export function OrgDetailsView({ username }: { username: string }) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (username: string) => {
      const results = await Promise.allSettled([
        getEnhancedOrgDetails(username),
        getOrgLimits(username),
        getInstalledPackages(username),
        getCurrentUserInfo(username),
      ]);

      return {
        orgDetails: results[0].status === "fulfilled" ? results[0].value : null,
        limits: results[1].status === "fulfilled" ? results[1].value : null,
        packages: results[2].status === "fulfilled" ? results[2].value : null,
        userInfo: results[3].status === "fulfilled" ? results[3].value : null,
        errors: {
          orgDetails: results[0].status === "rejected" ? results[0].reason : null,
          limits: results[1].status === "rejected" ? results[1].reason : null,
          packages: results[2].status === "rejected" ? results[2].reason : null,
          userInfo: results[3].status === "rejected" ? results[3].reason : null,
        },
      };
    },
    [username],
    { keepPreviousData: true },
  );

  if (isLoading || !data) {
    return <List isLoading={true} />;
  }

  return (
    <List searchBarPlaceholder="Search org details...">
      {/* Overview Section */}
      <List.Section title="Overview">
        {data.orgDetails && (
          <>
            <List.Item
              icon={{ source: Icon.Building, tintColor: Color.Blue }}
              title="Organization"
              subtitle={data.orgDetails.alias || data.orgDetails.username}
              accessories={[
                { tag: { value: data.orgDetails.edition || "Unknown", color: Color.Green } },
                { text: data.orgDetails.orgType || "Unknown" },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Org Id" content={data.orgDetails.id} />
                  <Action.OpenInBrowser url={data.orgDetails.instanceUrl} title="Open Instance URL" />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Globe}
              title="Instance"
              subtitle={data.orgDetails.instanceUrl}
              accessories={[{ text: `API v${data.orgDetails.apiVersion}` }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={data.orgDetails.instanceUrl} title="Open Instance URL" />
                  <Action.CopyToClipboard title="Copy Instance URL" content={data.orgDetails.instanceUrl} />
                </ActionPanel>
              }
            />
          </>
        )}
        {data.errors.orgDetails && (
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Failed to Load Org Details"
            subtitle={String(data.errors.orgDetails)}
            accessories={[{ tag: { value: "Error", color: Color.Red } }]}
          />
        )}
      </List.Section>

      {/* Limits Dashboard Section */}
      <List.Section title="Limits Dashboard">
        {data.limits &&
          PRIORITY_LIMITS.map((limitName) => {
            const limit = data.limits!.limits[limitName];
            if (!limit) return null;

            const used = limit.max - limit.remaining;
            const usagePercent = limit.max > 0 ? (used / limit.max) * 100 : 0;
            const color = getColorForUsage(usagePercent);

            return (
              <List.Item
                key={limit.name}
                icon={{ source: Icon.BarChart, tintColor: color }}
                title={formatLimitName(limit.name)}
                subtitle={`${used.toLocaleString()} of ${limit.max.toLocaleString()} used`}
                accessories={[
                  { tag: { value: `${Math.round(usagePercent)}%`, color } },
                  { text: `${limit.remaining.toLocaleString()} remaining` },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Limit Details"
                      content={`${limit.name}: ${used}/${limit.max}`}
                    />
                    <Action.OpenInBrowser
                      url="https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_limits.htm"
                      title="View Limits Documentation"
                    />
                  </ActionPanel>
                }
              />
            );
          }).filter(Boolean)}

        {data.errors.limits && (
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Failed to Load Limits"
            subtitle={String(data.errors.limits)}
            accessories={[{ tag: { value: "Error", color: Color.Red } }]}
          />
        )}
      </List.Section>

      {/* Current User Section */}
      <List.Section title="Current User">
        {data.userInfo && (
          <>
            <List.Item
              icon={{ source: Icon.Person, tintColor: Color.Purple }}
              title={data.userInfo.username}
              subtitle={data.userInfo.profileName}
              accessories={
                [
                  data.userInfo.isActive
                    ? { tag: { value: "Active", color: Color.Green } }
                    : { tag: { value: "Inactive", color: Color.Red } },
                  data.userInfo.roleName ? { text: data.userInfo.roleName } : undefined,
                ].filter(Boolean) as List.Item.Accessory[]
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Username" content={data.userInfo.username} />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Shield}
              title="Profile"
              subtitle={data.userInfo.profileName}
              accessories={[{ text: data.userInfo.userType }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Profile Name" content={data.userInfo.profileName} />
                </ActionPanel>
              }
            />
            {data.userInfo.roleName && (
              <List.Item
                icon={Icon.TwoPeople}
                title="Role"
                subtitle={data.userInfo.roleName}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Role Name" content={data.userInfo.roleName} />
                  </ActionPanel>
                }
              />
            )}
          </>
        )}

        {data.errors.userInfo && (
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Failed to Load User Info"
            subtitle={String(data.errors.userInfo)}
            accessories={[{ tag: { value: "Error", color: Color.Red } }]}
          />
        )}
      </List.Section>

      {/* Installed Packages Section */}
      <List.Section title={`Installed Packages${data.packages ? ` (${data.packages.length})` : ""}`}>
        {data.packages && data.packages.length > 0 ? (
          data.packages.map((pkg) => {
            const isManaged = pkg.SubscriberPackageNamespace && pkg.SubscriberPackageNamespace !== "";

            return (
              <List.Item
                key={pkg.Id}
                icon={{
                  source: isManaged ? Icon.Box : Icon.Document,
                  tintColor: isManaged ? Color.Orange : Color.Blue,
                }}
                title={pkg.SubscriberPackageName}
                subtitle={pkg.SubscriberPackageVersionNumber}
                accessories={
                  [
                    isManaged
                      ? { tag: { value: pkg.SubscriberPackageNamespace, color: Color.Orange } }
                      : { tag: { value: "Unmanaged", color: Color.Blue } },
                    pkg.SubscriberPackageVersionName ? { text: pkg.SubscriberPackageVersionName } : undefined,
                  ].filter(Boolean) as List.Item.Accessory[]
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Package Id" content={pkg.SubscriberPackageId} />
                    <Action.CopyToClipboard
                      title="Copy Version Id"
                      content={pkg.SubscriberPackageVersionId}
                      shortcut={{ modifiers: ["cmd"], key: "v" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        ) : data.packages && data.packages.length === 0 ? (
          <List.Item
            icon={Icon.Box}
            title="No Packages Installed"
            subtitle="This org has no managed or unmanaged packages"
          />
        ) : null}

        {data.errors.packages && (
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Failed to Load Packages"
            subtitle={String(data.errors.packages)}
            accessories={[{ tag: { value: "Error", color: Color.Red } }]}
          />
        )}
      </List.Section>
    </List>
  );
}

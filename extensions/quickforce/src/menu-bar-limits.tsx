import { Icon, MenuBarExtra } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listOrgs, openOrg, getOrgLimits, getAllOrgMetadata, OrgLimit } from "./lib/sfdx";

function formatLimitName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

const DISPLAYED_LIMITS = ["DailyApiRequests", "DataStorageMB", "FileStorageMB", "DailyAsyncApexExecutions"];

function formatLimit(limit: OrgLimit): string {
  const used = limit.max - limit.remaining;
  const pct = limit.max > 0 ? Math.round((used / limit.max) * 100) : 0;
  return `${used.toLocaleString()} / ${limit.max.toLocaleString()} (${pct}%)`;
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(async () => {
    const orgs = await listOrgs();
    const defaultOrg = orgs.find((o) => o.isDefaultUsername) ?? orgs[0];
    if (!defaultOrg) return null;
    const [limits, metadata] = await Promise.all([
      getOrgLimits(defaultOrg.alias || defaultOrg.username),
      getAllOrgMetadata(),
    ]);
    const label = metadata[defaultOrg.username]?.label || defaultOrg.alias || defaultOrg.username;
    return { org: defaultOrg, label, limits: limits.limits };
  }, []);

  // Only show the bare loading state before the first result - isLoading is
  // also true during revalidation, when we still have data to display.
  if (isLoading && data === undefined) {
    return <MenuBarExtra icon={Icon.Cloud} isLoading />;
  }

  if (!data) {
    return (
      <MenuBarExtra icon={Icon.Cloud}>
        <MenuBarExtra.Item title="No default org — set one in Manage Salesforce Orgs" />
      </MenuBarExtra>
    );
  }

  const apiLimit = data.limits["DailyApiRequests"];
  const title =
    apiLimit && apiLimit.max > 0
      ? `${Math.round(((apiLimit.max - apiLimit.remaining) / apiLimit.max) * 100)}%`
      : undefined;

  return (
    <MenuBarExtra icon={Icon.Cloud} title={title} isLoading={isLoading}>
      <MenuBarExtra.Section title={data.label}>
        {DISPLAYED_LIMITS.map((limitName) => {
          const limit = data.limits[limitName];
          if (!limit) return null;
          return <MenuBarExtra.Item key={limitName} title={formatLimitName(limitName)} subtitle={formatLimit(limit)} />;
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Org in Browser"
          icon={Icon.Globe}
          onAction={() => openOrg(data.org.alias || data.org.username)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

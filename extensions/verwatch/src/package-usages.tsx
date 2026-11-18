import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import {
  ownerOf,
  Package,
  PackageUsage,
  packagePageUrl,
  spansOrgs,
  usePackageUsages,
} from "./api";
import {
  groupOf,
  groups,
  packagistUrl,
  severityColors,
} from "./project-packages";
import { ErrorView } from "./error-view";
import { TeamDropdown, teamIcon, useTeamFilter } from "./team-dropdown";

/**
 * One package across every project that uses it, in every team, grouped by
 * where each project stands with it. ⌘P narrows it to one team.
 */
export function PackageUsages({ pkg }: { pkg: Package }) {
  const { data, error, isLoading, revalidate } = usePackageUsages(pkg.name);
  const teams = useTeamFilter();
  const usages = (data?.usages ?? []).filter(teams.includes);
  const showsOrg = spansOrgs(usages.map((usage) => usage.path));
  const title = pkg.display_name || pkg.name;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${title}: Projects`}
      searchBarPlaceholder={`Search ${usages.length} projects using ${title}`}
      searchBarAccessory={
        <TeamDropdown teams={data?.teams ?? []} onChange={teams.setTeam} />
      }
    >
      {error && usages.length === 0 && (
        <ErrorView error={error} onRetry={revalidate} />
      )}
      {groups.map(({ key, title: groupTitle, icon }) => {
        const inGroup = usages.filter((usage) => groupOf(usage) === key);

        return (
          <List.Section
            key={key}
            title={groupTitle}
            subtitle={String(inGroup.length)}
          >
            {inGroup.map((usage) => (
              <List.Item
                key={`${usage.team.slug}/${usage.path}`}
                icon={icon}
                title={usage.name}
                subtitle={showsOrg ? ownerOf(usage.path) : undefined}
                keywords={[usage.slug, usage.path, usage.team.name]}
                accessories={accessories(usage, teams.showsAll)}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open Project in VerWatch"
                      url={usage.url}
                    />
                    <Action.OpenInBrowser
                      title="Open Package in VerWatch"
                      icon={Icon.Box}
                      url={packagePageUrl(pkg.name, usage.team.slug)}
                    />
                    <Action.OpenInBrowser
                      title="Open on Packagist"
                      url={packagistUrl(pkg.name)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Project URL"
                      content={usage.url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function accessories(
  usage: PackageUsage,
  showsTeam: boolean,
): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];

  if (usage.security_severity) {
    items.push({
      tag: {
        value: usage.security_severity,
        color: severityColors[usage.security_severity],
      },
      tooltip: "Security fix waiting",
    });
  }

  items.push({
    text:
      usage.is_outdated && usage.latest_compatible_version
        ? `${usage.installed_version} → ${usage.latest_compatible_version}`
        : (usage.installed_version ?? ""),
  });

  if (showsTeam) {
    items.push({ tag: usage.team.name, icon: teamIcon(usage.team) });
  }

  return items;
}

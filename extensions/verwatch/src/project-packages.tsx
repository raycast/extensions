import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
} from "@raycast/api";
import { useState } from "react";
import { Package, Project, Severity, usePackages } from "./api";
import { ErrorView } from "./error-view";
import { PackageUsages } from "./package-usages";
import { RunUpdateForm } from "./run-update-form";
import { relative } from "./time";

export type Group = "urgent" | "outdated" | "uptodate";

export const severityColors: Record<Severity, Color> = {
  critical: Color.Red,
  high: Color.Orange,
  moderate: Color.Yellow,
  low: Color.SecondaryText,
};

/**
 * The project page's grouping: urgent wins, then anything behind (a
 * compatible update, or a security fix even one that needs a new major),
 * otherwise up to date.
 */
export function groupOf(pkg: {
  is_critical: boolean;
  is_outdated: boolean;
  security_severity: Severity | null;
}): Group {
  if (pkg.is_critical) {
    return "urgent";
  }

  return pkg.is_outdated || pkg.security_severity ? "outdated" : "uptodate";
}

export const groups: { key: Group; title: string; icon: Image.ImageLike }[] = [
  {
    key: "urgent",
    title: "Urgent",
    icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
  },
  {
    key: "outdated",
    title: "Outdated",
    icon: { source: Icon.ArrowUpCircle, tintColor: Color.Orange },
  },
  {
    key: "uptodate",
    title: "Up to Date",
    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
  },
];

export function packagistUrl(name: string): string {
  return `https://packagist.org/packages/${name}`;
}

/**
 * A project's packages and where each stands, grouped the way the project
 * page groups them. ⌘P narrows it to one group.
 */
export function ProjectPackages({ project }: { project: Project }) {
  const { data = [], error, isLoading, revalidate } = usePackages(project);
  const [filter, setFilter] = useState<Group | "all">("all");
  const [showsDetail, setShowsDetail] = useState(false);

  const counts = Object.fromEntries(
    groups.map(({ key }) => [
      key,
      data.filter((pkg) => groupOf(pkg) === key).length,
    ]),
  ) as Record<Group, number>;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showsDetail}
      navigationTitle={`${project.name}: Packages`}
      searchBarPlaceholder={`Search ${data.length} packages in ${project.name}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Show"
          onChange={(value) => setFilter(value as Group | "all")}
        >
          <List.Dropdown.Item title="All Packages" value="all" />
          {groups.map(({ key, title, icon }) => (
            <List.Dropdown.Item
              key={key}
              title={`${title} (${counts[key]})`}
              value={key}
              icon={icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error && data.length === 0 && (
        <ErrorView error={error} onRetry={revalidate} />
      )}
      {groups
        .filter(({ key }) => filter === "all" || filter === key)
        .map(({ key, title, icon }) => (
          <List.Section key={key} title={title} subtitle={String(counts[key])}>
            {data
              .filter((pkg) => groupOf(pkg) === key)
              .map((pkg) => (
                <List.Item
                  key={pkg.name}
                  icon={icon}
                  title={pkg.display_name || pkg.name}
                  subtitle={showsDetail ? undefined : pkg.name}
                  keywords={[pkg.name, pkg.type]}
                  accessories={showsDetail ? undefined : accessories(pkg, key)}
                  detail={<PackageDetail pkg={pkg} project={project} />}
                  actions={
                    <ActionPanel>
                      <Action
                        title={showsDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowsDetail(!showsDetail)}
                      />
                      <Action.Push
                        title="Show Projects Using It"
                        icon={Icon.AppWindowList}
                        target={<PackageUsages pkg={pkg} />}
                      />
                      <Action.OpenInBrowser
                        title="Open on Packagist"
                        url={packagistUrl(pkg.name)}
                      />
                      <Action.OpenInBrowser
                        title="Open Project in VerWatch"
                        url={project.url}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                      {project.source_type === "github" && (
                        <Action.Push
                          title="Run Update…"
                          icon={Icon.ArrowUpCircle}
                          target={<RunUpdateForm project={project} />}
                          shortcut={{ modifiers: ["cmd"], key: "u" }}
                        />
                      )}
                      <Action.CopyToClipboard
                        title="Copy Package Name"
                        content={pkg.name}
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
        ))}
    </List>
  );
}

function accessories(pkg: Package, group: Group): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];

  if (pkg.security_severity) {
    items.push({
      tag: {
        value: pkg.security_severity,
        color: severityColors[pkg.security_severity],
      },
      tooltip: "Security fix waiting",
    });
  }

  if (pkg.has_major_available) {
    items.push({
      tag: { value: `${pkg.latest_version} major`, color: Color.Purple },
      tooltip: "A new major version is out; updates stay on the current one",
    });
  }

  if (group !== "uptodate" && pkg.latest_compatible_version) {
    items.push({
      text: `${pkg.installed_version} → ${pkg.latest_compatible_version}`,
    });
  } else {
    items.push({ text: pkg.installed_version ?? "" });
  }

  return items;
}

function PackageDetail({ pkg, project }: { pkg: Package; project: Project }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Package" text={pkg.name} />
          <List.Item.Detail.Metadata.Label title="Type" text={pkg.type} />
          {pkg.constraint && (
            <List.Item.Detail.Metadata.Label
              title="Constraint"
              text={pkg.constraint}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Installed"
            text={pkg.installed_version ?? "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Latest Compatible"
            text={pkg.latest_compatible_version ?? "—"}
          />
          <List.Item.Detail.Metadata.Label
            title="Latest Release"
            text={pkg.latest_version ?? "—"}
          />
          <List.Item.Detail.Metadata.Separator />
          {project.last_synced_at && (
            <List.Item.Detail.Metadata.Label
              title="Project Synced"
              text={relative(project.last_synced_at)}
            />
          )}
          <List.Item.Detail.Metadata.Link
            title="Packagist"
            text="Open"
            target={packagistUrl(pkg.name)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

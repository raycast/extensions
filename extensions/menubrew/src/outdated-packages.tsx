import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  fetchBrewSnapshot,
  formatBytes,
  formatRelativeDate,
  runInTerminal,
  toggleIgnorePackage,
  upgradeCommandForCategory,
  upgradeCommandForPackage,
} from "./brew";
import { OutdatedPackage, PackageCategory } from "./types";

type FilterValue =
  | "active"
  | "all"
  | "standard"
  | "greedy"
  | "ignored"
  | "Formulae (CLI)"
  | "Casks (Apps)"
  | "Casks (Auto-update / Greedy)";

const CATEGORIES: PackageCategory[] = [
  "Formulae (CLI)",
  "Casks (Apps)",
  "Casks (Auto-update / Greedy)",
];

function categoryIcon(cat: PackageCategory): Icon {
  switch (cat) {
    case "Formulae (CLI)":
      return Icon.Terminal;
    case "Casks (Apps)":
      return Icon.AppWindow;
    case "Casks (Auto-update / Greedy)":
      return Icon.ArrowClockwise;
  }
}

export default function Command() {
  const [filter, setFilter] = useState<FilterValue>("active");
  const [sortBySize, setSortBySize] = useState<boolean>(false);

  const {
    data: snapshot,
    isLoading,
    revalidate,
  } = useCachedPromise(() => fetchBrewSnapshot(false), [], {
    keepPreviousData: true,
  });

  const packages = snapshot?.packages ?? [];
  const activePackages = packages.filter((p) => !p.isIgnored);
  const ignoredCount = packages.filter((p) => p.isIgnored).length;
  const standardCount = activePackages.filter((p) => !p.isGreedyOnly).length;
  const totalBytes = activePackages.reduce(
    (acc, p) => acc + (p.sizeBytes ?? 0),
    0,
  );

  const filtered = useMemo(() => {
    const list = packages.filter((pkg) => {
      if (filter === "active") return !pkg.isIgnored;
      if (filter === "all") return true;
      if (filter === "ignored") return Boolean(pkg.isIgnored);
      if (filter === "standard") return !pkg.isIgnored && !pkg.isGreedyOnly;
      if (filter === "greedy") return !pkg.isIgnored && pkg.isGreedyOnly;
      return !pkg.isIgnored && pkg.category === filter;
    });

    if (sortBySize) {
      return [...list].sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));
    }
    return list;
  }, [packages, filter, sortBySize]);

  const hb = snapshot?.homebrewStatus;

  async function handleToggleIgnore(pkg: OutdatedPackage) {
    const nowIgnored = await toggleIgnorePackage(pkg.id);
    await showToast({
      style: Toast.Style.Success,
      title: nowIgnored ? `Muted ${pkg.name}` : `Unmuted ${pkg.name}`,
    });
    revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter outdated packages…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category or Origin"
          value={filter}
          onChange={(v) => setFilter(v as FilterValue)}
        >
          <List.Dropdown.Item
            title={`Active (${activePackages.length})`}
            value="active"
          />
          <List.Dropdown.Item
            title={`All incl. Muted (${packages.length})`}
            value="all"
          />
          <List.Dropdown.Section title="Origin">
            <List.Dropdown.Item
              title={`Standard brew upgrade (${standardCount})`}
              value="standard"
            />
            <List.Dropdown.Item
              title={`--greedy only (${activePackages.length - standardCount})`}
              value="greedy"
            />
            {ignoredCount > 0 && (
              <List.Dropdown.Item
                title={`Muted (${ignoredCount})`}
                value="ignored"
              />
            )}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Category">
            {CATEGORIES.map((cat) => (
              <List.Dropdown.Item key={cat} title={cat} value={cat} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && filtered.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Everything is up to date"
          description={
            hb
              ? `Homebrew ${hb.version} • ${hb.isUpToDate ? "Up to date" : "Update available"}`
              : "No outdated packages found."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
              <Action
                title="Run Brew Cleanup in Terminal"
                icon={Icon.Trash}
                onAction={() => runInTerminal("brew cleanup")}
              />
              {hb?.isUpToDate === false && (
                <Action
                  title="Run Brew Update in Terminal"
                  icon={Icon.Terminal}
                  onAction={() => runInTerminal("brew update")}
                />
              )}
            </ActionPanel>
          }
        />
      ) : (
        CATEGORIES.map((category) => {
          const items = filtered.filter((p) => p.category === category);
          if (items.length === 0) return null;

          const catBytes = items.reduce(
            (acc, p) => acc + (p.sizeBytes ?? 0),
            0,
          );

          return (
            <List.Section
              key={category}
              title={category}
              subtitle={`${items.length} package(s) • ${formatBytes(catBytes)}`}
            >
              {items.map((pkg: OutdatedPackage) => {
                const cmd = upgradeCommandForPackage(pkg);
                const catCmd = upgradeCommandForCategory(category, items, true);
                const markdown = [
                  `# ${pkg.name}`,
                  pkg.description ? `${pkg.description}` : "",
                  `\`${pkg.installedVersion}\` → \`${pkg.latestVersion}\``,
                ]
                  .filter(Boolean)
                  .join("\n\n");

                return (
                  <List.Item
                    key={pkg.id}
                    icon={
                      pkg.isIgnored
                        ? Icon.EyeDisabled
                        : categoryIcon(pkg.category)
                    }
                    title={pkg.name}
                    subtitle={`${pkg.installedVersion} → ${pkg.latestVersion}`}
                    accessories={[
                      { tag: formatBytes(pkg.sizeBytes) },
                      {
                        tag: {
                          value: pkg.isGreedyOnly ? "--greedy" : "standard",
                          color: pkg.isGreedyOnly ? Color.Orange : Color.Green,
                        },
                      },
                    ]}
                    detail={
                      <List.Item.Detail
                        markdown={markdown}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.TagList title="Origin">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={
                                  pkg.isGreedyOnly
                                    ? "--greedy only"
                                    : "brew upgrade"
                                }
                                color={
                                  pkg.isGreedyOnly ? Color.Orange : Color.Green
                                }
                              />
                              {pkg.isIgnored && (
                                <List.Item.Detail.Metadata.TagList.Item
                                  text="Muted"
                                  color={Color.SecondaryText}
                                />
                              )}
                            </List.Item.Detail.Metadata.TagList>
                            <List.Item.Detail.Metadata.Label
                              title="Download Size"
                              text={formatBytes(pkg.sizeBytes)}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="First Detected"
                              text={`${new Date(pkg.firstSeenAt).toLocaleString()} (${formatRelativeDate(pkg.firstSeenAt)})`}
                            />
                            <List.Item.Detail.Metadata.TagList title="Since Last Upgrade">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={
                                  pkg.isOnlySinceLastUpgrade
                                    ? "Only update since last upgrade"
                                    : `1 of ${pkg.totalSinceLastUpgrade} updates`
                                }
                                color={
                                  pkg.isOnlySinceLastUpgrade
                                    ? Color.Blue
                                    : Color.SecondaryText
                                }
                              />
                            </List.Item.Detail.Metadata.TagList>
                            {pkg.tap && (
                              <List.Item.Detail.Metadata.Label
                                title="Tap"
                                text={pkg.tap}
                              />
                            )}
                            {pkg.homepage && (
                              <List.Item.Detail.Metadata.Link
                                title="Homepage"
                                target={pkg.homepage}
                                text={pkg.homepage}
                              />
                            )}
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label
                              title="Homebrew"
                              text={
                                hb
                                  ? `${hb.version} — ${hb.isUpToDate === true ? "Up to date" : hb.isUpToDate === false ? `${hb.commitsBehind} commit(s) behind` : "Unknown"}`
                                  : "Checking…"
                              }
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Total Active"
                              text={`${activePackages.length} packages (${formatBytes(totalBytes)})`}
                            />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Upgrade in Terminal">
                          <Action
                            title={`Upgrade ${pkg.name}`}
                            icon={Icon.Terminal}
                            onAction={() => runInTerminal(cmd)}
                          />
                          <Action
                            title={`Upgrade ${category}`}
                            icon={Icon.Box}
                            shortcut={{
                              modifiers: ["cmd", "shift"],
                              key: "enter",
                            }}
                            onAction={() => runInTerminal(catCmd)}
                          />
                          {standardCount > 0 && (
                            <Action
                              title={`Upgrade All Standard (${standardCount})`}
                              icon={Icon.Play}
                              onAction={() => runInTerminal("brew upgrade")}
                            />
                          )}
                          <Action
                            title={`Upgrade All --greedy (${activePackages.length})`}
                            icon={Icon.Play}
                            onAction={() =>
                              runInTerminal("brew upgrade --greedy")
                            }
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Package">
                          {pkg.homepage && (
                            <Action.OpenInBrowser
                              title="Open Homepage"
                              url={pkg.homepage}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "h",
                              }}
                            />
                          )}
                          <Action
                            title={
                              pkg.isIgnored
                                ? "Unmute Package"
                                : "Mute Package from Badge"
                            }
                            icon={pkg.isIgnored ? Icon.Eye : Icon.EyeDisabled}
                            shortcut={{ modifiers: ["cmd"], key: "m" }}
                            onAction={() => handleToggleIgnore(pkg)}
                          />
                          <Action.CopyToClipboard
                            title="Copy Upgrade Command"
                            content={cmd}
                            shortcut={{ modifiers: ["cmd"], key: "c" }}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Maintenance & View">
                          <Action
                            title={
                              sortBySize
                                ? "Sort by Name"
                                : "Sort by Largest Size"
                            }
                            icon={Icon.ArrowUp}
                            shortcut={{ modifiers: ["cmd"], key: "s" }}
                            onAction={() => setSortBySize((s) => !s)}
                          />
                          <Action
                            title="Run Brew Cleanup"
                            icon={Icon.Trash}
                            onAction={() => runInTerminal("brew cleanup")}
                          />
                          <Action
                            title="Run Brew Doctor"
                            icon={Icon.Heart}
                            onAction={() => runInTerminal("brew doctor")}
                          />
                          <Action
                            title="Refresh"
                            icon={Icon.ArrowClockwise}
                            shortcut={{ modifiers: ["cmd"], key: "r" }}
                            onAction={() => revalidate()}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })
      )}
    </List>
  );
}

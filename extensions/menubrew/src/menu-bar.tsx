import {
  Clipboard,
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  environment,
  launchCommand,
  open,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
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
  const isBackground = environment.launchType === LaunchType.Background;
  const {
    data: snapshot,
    isLoading,
    revalidate,
  } = useCachedPromise(() => fetchBrewSnapshot(isBackground), [], {
    keepPreviousData: true,
  });

  const allPackages = snapshot?.packages ?? [];
  const packages = allPackages.filter((p) => !p.isIgnored);
  const mutedCount = allPackages.length - packages.length;
  const totalBytes = packages.reduce((acc, p) => acc + (p.sizeBytes ?? 0), 0);
  const standardCount = packages.filter((p) => !p.isGreedyOnly).length;
  const greedyCount = packages.filter((p) => p.isGreedyOnly).length;

  const menuTitle =
    isLoading && !snapshot
      ? "…"
      : packages.length > 0
        ? `${packages.length}`
        : "✓";
  const tooltip = snapshot
    ? `MenuBrew — ${packages.length} update(s) • ${formatBytes(totalBytes)}`
    : "MenuBrew — Checking Homebrew…";

  const hb = snapshot?.homebrewStatus;
  const hbText = !hb
    ? "Homebrew: Checking…"
    : hb.isUpToDate === true
      ? `Homebrew ${hb.version}: Up to date`
      : hb.isUpToDate === false
        ? `Homebrew ${hb.version}: ${hb.commitsBehind} commit(s) behind`
        : `Homebrew ${hb.version}: Unknown status`;

  return (
    <MenuBarExtra
      icon={Icon.Mug}
      title={menuTitle}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item
          icon={
            hb?.isUpToDate === true
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.ExclamationMark, tintColor: Color.Orange }
          }
          title={hbText}
          onAction={
            hb?.isUpToDate === false
              ? () => runInTerminal("brew update")
              : undefined
          }
        />
        {snapshot && (
          <MenuBarExtra.Item
            icon={Icon.Box}
            title={
              packages.length === 0
                ? "All active packages up to date"
                : `${packages.length} updates (${standardCount} standard, ${greedyCount} --greedy)`
            }
            subtitle={
              packages.length > 0
                ? `${formatBytes(totalBytes)}${mutedCount > 0 ? ` • ${mutedCount} muted` : ""}`
                : mutedCount > 0
                  ? `${mutedCount} muted`
                  : undefined
            }
          />
        )}
        {snapshot?.lastUpgradeAt && (
          <MenuBarExtra.Item
            icon={Icon.Clock}
            title={`Last upgrade: ${formatRelativeDate(snapshot.lastUpgradeAt)}`}
            subtitle={new Date(snapshot.lastUpgradeAt).toLocaleString()}
          />
        )}
      </MenuBarExtra.Section>

      {CATEGORIES.map((category) => {
        const items = packages.filter((p) => p.category === category);
        if (items.length === 0) return null;

        const catBytes = items.reduce((acc, p) => acc + (p.sizeBytes ?? 0), 0);
        const stdInCat = items.filter((p) => !p.isGreedyOnly);

        return (
          <MenuBarExtra.Section
            key={category}
            title={`${category} (${items.length}) • ${formatBytes(catBytes)}`}
          >
            {stdInCat.length > 0 && (
              <MenuBarExtra.Item
                icon={Icon.Play}
                title={`Upgrade ${category} (standard, ${stdInCat.length})`}
                onAction={() =>
                  runInTerminal(
                    upgradeCommandForCategory(category, stdInCat, false),
                  )
                }
              />
            )}
            {(items.some((p) => p.isGreedyOnly) ||
              category === "Casks (Auto-update / Greedy)") && (
              <MenuBarExtra.Item
                icon={Icon.Play}
                title={`Upgrade ${category} (--greedy, ${items.length})`}
                onAction={() =>
                  runInTerminal(
                    upgradeCommandForCategory(category, items, true),
                  )
                }
              />
            )}
            {items.map((pkg: OutdatedPackage) => {
              const cmd = upgradeCommandForPackage(pkg);
              return (
                <MenuBarExtra.Submenu
                  key={pkg.id}
                  icon={categoryIcon(pkg.category)}
                  title={`${pkg.name}  (${pkg.installedVersion} → ${pkg.latestVersion})`}
                >
                  <MenuBarExtra.Item
                    icon={pkg.isGreedyOnly ? Icon.Bolt : Icon.Check}
                    title={
                      pkg.isGreedyOnly
                        ? "Origin: --greedy only"
                        : "Origin: standard brew upgrade"
                    }
                  />
                  <MenuBarExtra.Item
                    icon={Icon.Download}
                    title={`Size: ${formatBytes(pkg.sizeBytes)}`}
                  />
                  <MenuBarExtra.Item
                    icon={Icon.Calendar}
                    title={`Detected: ${formatRelativeDate(pkg.firstSeenAt)}`}
                    subtitle={new Date(pkg.firstSeenAt).toLocaleString()}
                  />
                  <MenuBarExtra.Item
                    icon={Icon.Info}
                    title={
                      pkg.isOnlySinceLastUpgrade
                        ? "Only update since last upgrade"
                        : `1 of ${pkg.totalSinceLastUpgrade} since last upgrade`
                    }
                  />
                  <MenuBarExtra.Separator />
                  <MenuBarExtra.Item
                    icon={Icon.Terminal}
                    title="Upgrade in Terminal"
                    subtitle={cmd}
                    onAction={() => runInTerminal(cmd)}
                  />
                  {pkg.homepage && (
                    <MenuBarExtra.Item
                      icon={Icon.Globe}
                      title="Open Homepage"
                      onAction={() => open(pkg.homepage!)}
                    />
                  )}
                  <MenuBarExtra.Item
                    icon={Icon.Clipboard}
                    title="Copy Command"
                    onAction={async () => {
                      await Clipboard.copy(cmd);
                      await showHUD(`Copied: ${cmd}`);
                    }}
                  />
                  <MenuBarExtra.Item
                    icon={Icon.EyeDisabled}
                    title="Mute from Badge"
                    onAction={async () => {
                      await toggleIgnorePackage(pkg.id);
                      await revalidate();
                    }}
                  />
                </MenuBarExtra.Submenu>
              );
            })}
          </MenuBarExtra.Section>
        );
      })}

      <MenuBarExtra.Section title="Actions">
        {standardCount > 0 && (
          <MenuBarExtra.Item
            icon={Icon.Terminal}
            title={`Run brew upgrade (${standardCount} standard)`}
            onAction={() => runInTerminal("brew upgrade")}
          />
        )}
        {packages.length > 0 && (
          <MenuBarExtra.Item
            icon={Icon.Terminal}
            title={`Run brew upgrade --greedy (${packages.length})`}
            onAction={() => runInTerminal("brew upgrade --greedy")}
          />
        )}
        <MenuBarExtra.Item
          icon={Icon.AppWindowList}
          title="Open Full Dashboard"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() =>
            launchCommand({
              name: "outdated-packages",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh Now"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => revalidate()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

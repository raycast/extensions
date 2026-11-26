import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { InstallPackageForm } from "./components/InstallPackageForm";
import { PackageDetailView } from "./components/PackageDetailView";
import { PACKAGE_MANAGER_META, POPULAR_PACKAGES_SUGGESTIONS } from "./lib/constants";
import { formatDuration, formatNumber, formatRelativeTime, formatScorePercent, truncateText } from "./lib/format";
import { notifyOperationResult } from "./lib/notifications";
import { buildInstallCommand, executeInstall } from "./lib/package-manager";
import { searchNpmPackages } from "./lib/registry";
import {
  clearRecentSearches,
  getFavorites,
  getRecentSearches,
  recordRecentSearch,
  toggleFavorite,
} from "./lib/storage";
import { useProjects } from "./lib/useProjects";
import { NpmSearchResult, PackageManagerName } from "./types";

const GLOBAL_OPTION = "__global__";

export default function SearchPackagesCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(true);
  const [targetOverride, setTargetOverride] = useState<string>("");

  const { projects, activeProject, selectActiveProject } = useProjects();
  const effectiveTargetValue = targetOverride || activeProject?.path || GLOBAL_OPTION;
  const selectedProject = useMemo(
    () => (effectiveTargetValue === GLOBAL_OPTION ? undefined : projects.find((p) => p.path === effectiveTargetValue)),
    [effectiveTargetValue, projects],
  );

  const defaultPm: PackageManagerName =
    selectedProject?.packageManager ??
    (prefs.defaultPackageManager && prefs.defaultPackageManager !== "auto"
      ? (prefs.defaultPackageManager as PackageManagerName)
      : "npm");

  const {
    data: results,
    isLoading,
    error,
  } = usePromise(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) return [];
      return searchNpmPackages(trimmed, {
        registryUrl: prefs.registryUrl,
        size: 25,
        includeDownloads: true,
      });
    },
    [searchText],
  );

  const { data: favorites, revalidate: revalidateFavs } = usePromise(getFavorites);
  const { data: recentSearches, revalidate: revalidateRecents } = usePromise(getRecentSearches);

  const favNames = useMemo(() => new Set((favorites ?? []).map((f) => f.name)), [favorites]);

  async function rememberSearch(query: string) {
    if (query.trim().length >= 2) {
      await recordRecentSearch(query.trim());
      await revalidateRecents();
    }
  }

  async function handleQuickInstall(pkgName: string, depType: "prod" | "dev", forceGlobal = false) {
    await rememberSearch(searchText);
    const isGlobal = forceGlobal || !selectedProject;
    const pm = isGlobal ? defaultPm : selectedProject.packageManager;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${pkgName}...`,
      message: isGlobal ? `Global (${pm})` : `${selectedProject.name} (${pm})`,
    });

    const outcome = await executeInstall({
      pm,
      packageName: pkgName,
      projectPath: isGlobal ? undefined : selectedProject?.path,
      projectName: isGlobal ? undefined : selectedProject?.name,
      isGlobal,
      depType,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Installed ${pkgName}` : `Install failed for ${pkgName}`,
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });
  }

  async function handleToggleFavorite(pkg: {
    name: string;
    description: string;
    version: string;
    links?: NpmSearchResult["links"];
  }) {
    if (favNames.has(pkg.name)) {
      const ok = await confirmAlert({
        title: `Remove "${pkg.name}" from Favorites?`,
        message: "You can add it back anytime from Search npm Packages.",
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }

    const res = await toggleFavorite(pkg);
    await revalidateFavs();
    await showToast({
      style: Toast.Style.Success,
      title: res.isFavorite ? `Added ${pkg.name} to Favorites` : `Removed ${pkg.name} from Favorites`,
    });
  }

  function renderResultItem(pkg: NpmSearchResult) {
    const isFav = favNames.has(pkg.name);
    const installCmd = buildInstallCommand(defaultPm, pkg.name, { isGlobal: !selectedProject }).display;

    return (
      <List.Item
        key={pkg.name}
        icon={{ source: isFav ? Icon.Star : Icon.Box, tintColor: isFav ? Color.Yellow : Color.Red }}
        title={pkg.name}
        subtitle={showDetail ? undefined : truncateText(pkg.description || "", 60)}
        accessories={
          showDetail
            ? [{ text: `v${pkg.version}` }]
            : [
                ...(pkg.weeklyDownloads !== undefined
                  ? [{ icon: Icon.Download, text: `${formatNumber(pkg.weeklyDownloads)}/wk` }]
                  : []),
                { tag: { value: `v${pkg.version}`, color: Color.SecondaryText } },
              ]
        }
        detail={
          <List.Item.Detail
            markdown={[
              `# ${pkg.name}`,
              pkg.description ? `${pkg.description}` : "_No description provided._",
              "",
              `\`\`\`bash\n${installCmd}\n\`\`\``,
            ].join("\n\n")}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Latest Version" text={pkg.version} icon={Icon.Tag} />
                {pkg.weeklyDownloads !== undefined && (
                  <List.Item.Detail.Metadata.Label
                    title="Weekly Downloads"
                    text={formatNumber(pkg.weeklyDownloads)}
                    icon={Icon.Download}
                  />
                )}
                <List.Item.Detail.Metadata.Label title="Updated" text={formatRelativeTime(pkg.date)} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Popularity"
                  text={formatScorePercent(pkg.score.detail.popularity)}
                />
                <List.Item.Detail.Metadata.Label title="Quality" text={formatScorePercent(pkg.score.detail.quality)} />
                <List.Item.Detail.Metadata.Label
                  title="Maintenance"
                  text={formatScorePercent(pkg.score.detail.maintenance)}
                />
                {pkg.publisher?.username && (
                  <List.Item.Detail.Metadata.Label title="Publisher" text={pkg.publisher.username} />
                )}
                {pkg.keywords.length > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Keywords">
                      {pkg.keywords.slice(0, 6).map((kw) => (
                        <List.Item.Detail.Metadata.TagList.Item key={kw} text={kw} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </>
                )}
                <List.Item.Detail.Metadata.Separator />
                {pkg.links.npm && (
                  <List.Item.Detail.Metadata.Link title="npm" target={pkg.links.npm} text="npmjs.com" />
                )}
                {pkg.links.repository && (
                  <List.Item.Detail.Metadata.Link title="Repository" target={pkg.links.repository} text="Source" />
                )}
                {pkg.links.homepage && (
                  <List.Item.Detail.Metadata.Link title="Homepage" target={pkg.links.homepage} text="Docs" />
                )}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Inspect & Install">
              <Action.Push
                title="View Full Details & README"
                icon={Icon.Document}
                target={<PackageDetailView packageName={pkg.name} activeProject={selectedProject} />}
                onPush={() => void rememberSearch(searchText)}
              />
              <Action.Push
                title="Install Package (Options)…"
                icon={Icon.Download}
                target={
                  <InstallPackageForm
                    packageName={pkg.name}
                    defaultProject={selectedProject}
                    defaultGlobal={!selectedProject}
                  />
                }
                onPush={() => void rememberSearch(searchText)}
              />
              {selectedProject ? (
                <>
                  <Action
                    title={`Quick Install to ${selectedProject.name}`}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    onAction={() => handleQuickInstall(pkg.name, "prod", false)}
                  />
                  <Action
                    title={`Install as Dev Dependency in ${selectedProject.name}`}
                    icon={Icon.Hammer}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={() => handleQuickInstall(pkg.name, "dev", false)}
                  />
                </>
              ) : null}
              <Action
                title={`Install Globally (${defaultPm})`}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
                onAction={() => handleQuickInstall(pkg.name, "prod", true)}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Favorites & Copy">
              <Action
                title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                icon={isFav ? Icon.StarDisabled : Icon.Star}
                style={isFav ? Action.Style.Destructive : Action.Style.Regular}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() =>
                  handleToggleFavorite({
                    name: pkg.name,
                    description: pkg.description,
                    version: pkg.version,
                    links: pkg.links,
                  })
                }
              />
              <Action.CopyToClipboard
                title={`Copy "${installCmd}"`}
                content={installCmd}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard title="Copy Package Name" content={pkg.name} />
              <Action
                title={showDetail ? "Hide Detail Pane" : "Show Detail Pane"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => setShowDetail((v) => !v)}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Links">
              {pkg.links.npm && <Action.OpenInBrowser title="Open on npm" url={pkg.links.npm} />}
              {pkg.links.repository && <Action.OpenInBrowser title="Open Repository" url={pkg.links.repository} />}
              {pkg.links.homepage && <Action.OpenInBrowser title="Open Homepage" url={pkg.links.homepage} />}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const hasQuery = searchText.trim().length >= 2;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasQuery && showDetail && (results?.length ?? 0) > 0}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search npm registry (e.g. zod, react, @tanstack/query)..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Quick Install Target Project"
          value={effectiveTargetValue}
          onChange={async (val) => {
            setTargetOverride(val);
            if (val !== GLOBAL_OPTION) {
              await selectActiveProject(val);
            }
          }}
        >
          <List.Dropdown.Section title="Target">
            <List.Dropdown.Item value={GLOBAL_OPTION} title="Global (-g)" icon={Icon.Globe} />
          </List.Dropdown.Section>
          {projects.length > 0 && (
            <List.Dropdown.Section title="Local Projects">
              {projects.map((p) => (
                <List.Dropdown.Item
                  key={p.path}
                  value={p.path}
                  title={`${p.name} (${PACKAGE_MANAGER_META[p.packageManager].label})`}
                  icon={p.path === activeProject?.path ? Icon.Star : Icon.Folder}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.WifiDisabled, tintColor: Color.Red }}
          title="Could Not Reach npm Registry"
          description={error.message}
        />
      ) : hasQuery ? (
        (results ?? []).length === 0 && !isLoading ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={`No Packages Found for "${searchText}"`}
            description="Try a different package name or keyword."
          />
        ) : (
          <List.Section
            title="npm Registry Results"
            subtitle={
              selectedProject
                ? `Target: ${selectedProject.name} (${PACKAGE_MANAGER_META[selectedProject.packageManager].label})`
                : `Target: Global (${defaultPm})`
            }
          >
            {(results ?? []).map(renderResultItem)}
          </List.Section>
        )
      ) : (
        <>
          {(favorites ?? []).length > 0 && (
            <List.Section title="Favorites" subtitle={`${favorites?.length} saved`}>
              {(favorites ?? []).slice(0, 8).map((fav) => (
                <List.Item
                  key={`fav-${fav.name}`}
                  icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                  title={fav.name}
                  subtitle={fav.description}
                  accessories={fav.version ? [{ tag: `v${fav.version}` }] : []}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Full Details & README"
                        icon={Icon.Document}
                        target={<PackageDetailView packageName={fav.name} activeProject={selectedProject} />}
                      />
                      <Action.Push
                        title="Install Package…"
                        icon={Icon.Download}
                        target={
                          <InstallPackageForm
                            packageName={fav.name}
                            defaultProject={selectedProject}
                            defaultGlobal={!selectedProject}
                          />
                        }
                      />
                      <Action
                        title="Search in Registry"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => setSearchText(fav.name)}
                      />
                      <Action
                        title="Remove from Favorites"
                        icon={Icon.StarDisabled}
                        style={Action.Style.Destructive}
                        onAction={() => handleToggleFavorite(fav)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {(recentSearches ?? []).length > 0 && (
            <List.Section title="Recent Searches">
              {(recentSearches ?? []).slice(0, 6).map((term) => (
                <List.Item
                  key={`recent-${term}`}
                  icon={Icon.Clock}
                  title={term}
                  actions={
                    <ActionPanel>
                      <Action
                        title={`Search "${term}"`}
                        icon={Icon.MagnifyingGlass}
                        onAction={() => setSearchText(term)}
                      />
                      <Action
                        title="Clear Recent Searches"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const ok = await confirmAlert({
                            title: "Clear all recent searches?",
                            message: "This permanently removes your saved search history.",
                            primaryAction: { title: "Clear Searches", style: Alert.ActionStyle.Destructive },
                          });
                          if (!ok) return;
                          await clearRecentSearches();
                          await revalidateRecents();
                          await showToast({ style: Toast.Style.Success, title: "Recent searches cleared" });
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Popular Packages">
            {POPULAR_PACKAGES_SUGGESTIONS.map((pkg) => (
              <List.Item
                key={`pop-${pkg.name}`}
                icon={{ source: Icon.Box, tintColor: Color.Red }}
                title={pkg.name}
                subtitle={pkg.description}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Full Details & README"
                      icon={Icon.Document}
                      target={<PackageDetailView packageName={pkg.name} activeProject={selectedProject} />}
                    />
                    <Action.Push
                      title="Install Package…"
                      icon={Icon.Download}
                      target={
                        <InstallPackageForm
                          packageName={pkg.name}
                          defaultProject={selectedProject}
                          defaultGlobal={!selectedProject}
                        />
                      }
                    />
                    <Action
                      title="Search Related Packages"
                      icon={Icon.MagnifyingGlass}
                      onAction={() => setSearchText(pkg.name)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

import { List, getPreferenceValues, ActionPanel, Action, Icon, showToast, Toast, Cache, trash } from "@raycast/api";
import path from "path";
import { useEffect, useState, useMemo, useCallback } from "react";
import { usePromise } from "@raycast/utils";
import { getGramExtensionsDir, GramBuild } from "./lib/gram";
import {
  includesAllWords,
  getInstalledExtensions,
  ZedExtension,
  ZedResponse,
  installExtension,
  getDomainLabel,
  getLatestExtensionDownloadUrl,
  getVersionedExtensionDownloadUrl,
  isExtensionOutdated,
} from "./lib/extension";
import { getIgnoredExtensionsMap, setExtensionIgnore, removeExtensionIgnore, IgnoredMap } from "./lib/ignore";
import { ExtensionItem } from "./components/extension-item";
import { VersionSubmenu, clearVersionCache } from "./components/version-submenu";
import { apiFetch } from "./lib/api";

const raycastCache = new Cache({ namespace: "gram-extension-list" });

type FilterCriterion = {
  regex: RegExp;
  validator: (ext: ZedExtension, val: string) => boolean;
};

type ExtensionListItem = {
  ext: ZedExtension;
  installedVersion?: string;
  currentlyInstalled: boolean;
  isIgnored: boolean;
  isOutdated: boolean;
};

function parseCacheRecord<T>(value: string | undefined): Record<string, T> {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, T>;
  } catch {
    return {};
  }
}

const FILTER_CRITERIA: FilterCriterion[] = [
  { regex: /id:(\S+)/, validator: (ext: ZedExtension, val: string) => ext.id.toLowerCase().includes(val) },
  {
    regex: /name:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.name.toLowerCase().includes(val),
  },
  {
    regex: /desc:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.description.toLowerCase().includes(val),
  },
  {
    regex: /version:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.version.toLowerCase().includes(val),
  },
  {
    regex: /author:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.authors.some((a) => a.toLowerCase().includes(val)),
  },
  {
    regex: /repo:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.repository.toLowerCase().includes(val),
  },
  {
    regex: /schema:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.schema_version.toString().includes(val),
  },
  {
    regex: /wasm:(\S+)/,
    validator: (ext: ZedExtension, val: string) => !!ext.wasm_api_version?.toLowerCase().includes(val),
  },
  {
    regex: /provides:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.provides.some((p) => p.toLowerCase().includes(val)),
  },
  {
    regex: /date:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.published_at.toLowerCase().includes(val),
  },
  {
    regex: /downloads:(\S+)/,
    validator: (ext: ZedExtension, val: string) => ext.download_count.toString().includes(val),
  },
];

function getApiSearchText(searchText: string): string {
  let text = searchText.toLowerCase();
  FILTER_CRITERIA.forEach(({ regex }) => {
    text = text.replace(regex, "");
  });
  return text.trim();
}

function buildExtensionsApiUrl(apiSearchText: string, selectedProvides: string): string {
  const url = new URL("https://api.zed.dev/extensions");
  url.searchParams.append("max_schema_version", "1");

  if (apiSearchText) url.searchParams.append("filter", apiSearchText);
  if (selectedProvides !== "all") url.searchParams.append("provides", selectedProvides);

  return url.toString();
}

function buildInstalledExtensionsMap(installed: Array<{ id: string; version: string }>): Record<string, string> {
  return installed.reduce<Record<string, string>>((acc, ext) => {
    acc[ext.id] = ext.version;
    return acc;
  }, {});
}

function getActiveFilters(query: string): {
  query: string;
  activeFilters: Array<{ validator: (ext: ZedExtension, val: string) => boolean; val: string }>;
} {
  const activeFilters: Array<{ validator: (ext: ZedExtension, val: string) => boolean; val: string }> = [];

  FILTER_CRITERIA.forEach(({ regex, validator }) => {
    const match = query.match(regex);
    if (match) {
      activeFilters.push({ validator, val: match[1] });
      query = query.replace(regex, "");
    }
  });

  return { query: query.trim(), activeFilters };
}

function getExtensionSearchBlob(ext: ZedExtension): string {
  return [
    ext.name,
    ext.id,
    ext.description,
    ext.version,
    ext.repository,
    ext.authors.join(" "),
    ext.provides.join(" ") || "",
    `schema ${ext.schema_version}`,
    ext.wasm_api_version || "",
  ].join(" ");
}

function shouldIncludeExtension({
  activeFilters,
  ext,
  isIgnored,
  isOutdated,
  query,
  currentlyInstalled,
  selectedProvides,
  selectedStatus,
}: {
  activeFilters: Array<{ validator: (ext: ZedExtension, val: string) => boolean; val: string }>;
  ext: ZedExtension;
  isIgnored: boolean;
  isOutdated: boolean;
  query: string;
  currentlyInstalled: boolean;
  selectedProvides: string;
  selectedStatus: string;
}): boolean {
  if (selectedStatus === "installed" && !currentlyInstalled) return false;
  if (selectedStatus === "uninstalled" && currentlyInstalled) return false;
  if (selectedStatus === "outdated" && !isOutdated) return false;
  if (selectedStatus === "ignored" && !isIgnored) return false;

  if (selectedProvides !== "all" && !ext.provides.includes(selectedProvides)) return false;

  const matchesFilters = activeFilters.every(({ validator, val }) => validator(ext, val));
  if (!matchesFilters) return false;

  if (query && !includesAllWords(getExtensionSearchBlob(ext), query)) return false;

  return true;
}

function filterExtensions({
  extensions,
  ignoredMap,
  installedExtensionsMap,
  searchText,
  selectedProvides,
  selectedStatus,
}: {
  extensions: ZedExtension[];
  ignoredMap: IgnoredMap;
  installedExtensionsMap: Record<string, string>;
  searchText: string;
  selectedProvides: string;
  selectedStatus: string;
}): ExtensionListItem[] {
  const { query, activeFilters } = getActiveFilters(searchText.toLowerCase());

  return extensions.reduce((acc, ext) => {
    const installedVersion = installedExtensionsMap[ext.id];
    const isIgnored = ext.id in ignoredMap;
    const currentlyInstalled = !!installedVersion;
    const isOutdated = isExtensionOutdated(ext, installedVersion, ignoredMap);

    if (
      !shouldIncludeExtension({
        activeFilters,
        ext,
        isIgnored,
        isOutdated,
        query,
        currentlyInstalled,
        selectedProvides,
        selectedStatus,
      })
    ) {
      return acc;
    }

    acc.push({ ext, installedVersion, currentlyInstalled, isIgnored, isOutdated });
    return acc;
  }, [] as ExtensionListItem[]);
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const gramBuild = preferences.build as GramBuild;
  const installedMapCacheKey = `installed-map:${gramBuild}`;

  const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [selectedProvides, setSelectedProvides] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [installedExtensionsMap, setInstalledExtensionsMap] = useState<Record<string, string>>(() => {
    return parseCacheRecord<string>(raycastCache.get(installedMapCacheKey));
  });

  const [ignoredMap, setIgnoredMap] = useState<IgnoredMap>({});

  const [extensionCache, setExtensionCache] = useState<Record<string, ZedExtension>>(() => {
    return parseCacheRecord<ZedExtension>(raycastCache.get("master-list"));
  });

  const targetInstallDir = useMemo(() => {
    return path.join(getGramExtensionsDir(gramBuild), "installed");
  }, [gramBuild]);

  useEffect(() => {
    getIgnoredExtensionsMap().then(setIgnoredMap);
  }, []);

  const apiSearchText = useMemo(() => {
    return getApiSearchText(debouncedSearchText);
  }, [debouncedSearchText]);

  const apiUrl = useMemo(() => {
    return buildExtensionsApiUrl(apiSearchText, selectedProvides);
  }, [apiSearchText, selectedProvides]);

  const {
    isLoading,
    data: fetchedExtensions = [],
    revalidate,
  } = usePromise(
    async (url: string) => {
      const response = await apiFetch(url);
      const json = (await response.json()) as ZedResponse;
      return json.data || [];
    },
    [apiUrl],
    {
      onData: (fetchedData) => {
        setExtensionCache((prevCache) => {
          const updatedCache = { ...prevCache };
          for (const ext of fetchedData) {
            updatedCache[ext.id] = ext;
          }
          raycastCache.set("master-list", JSON.stringify(updatedCache));
          return updatedCache;
        });
      },
      onError: (error) => {
        console.error("usePromise lifecycle caught an error:", error);
      },
    },
  );

  const extensions = useMemo(() => {
    if (searchText.trim() === "" && selectedProvides === "all") {
      return Object.values(extensionCache).sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
    }

    return fetchedExtensions;
  }, [fetchedExtensions, extensionCache, searchText, selectedProvides]);

  const handleClearCache = useCallback(async () => {
    raycastCache.clear();
    clearVersionCache();
    setExtensionCache({});
    revalidate();
    await showToast({ style: Toast.Style.Success, title: "Cache cleared successfully" });
  }, [revalidate]);

  const checkInstallations = useCallback(async () => {
    const extensionPath = getGramExtensionsDir(gramBuild);
    const installed = await getInstalledExtensions(extensionPath);
    const installationMap = buildInstalledExtensionsMap(installed);

    setInstalledExtensionsMap(installationMap);
    raycastCache.set(installedMapCacheKey, JSON.stringify(installationMap));
  }, [gramBuild, installedMapCacheKey]);

  useEffect(() => {
    checkInstallations();
  }, [checkInstallations]);

  useEffect(() => {
    if (searchText.trim() === "") {
      setDebouncedSearchText("");
      return;
    }

    const timer = setTimeout(() => setDebouncedSearchText(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const outdatedExtensions = useMemo(() => {
    return Object.values(extensionCache).filter((ext) => {
      const installedVersion = installedExtensionsMap[ext.id];
      return isExtensionOutdated(ext, installedVersion, ignoredMap);
    });
  }, [extensionCache, installedExtensionsMap, ignoredMap]);

  const handleUpdateAll = useCallback(async () => {
    if (outdatedExtensions.length === 0) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${outdatedExtensions.length} extensions...`,
    });

    let successCount = 0;
    let failureCount = 0;

    for (const [index, ext] of outdatedExtensions.entries()) {
      toast.message = `Updating ${ext.name} (${index + 1}/${outdatedExtensions.length})`;

      try {
        await installExtension({
          downloadUrl: getLatestExtensionDownloadUrl(ext),
          extensionId: ext.id,
          targetInstallDir,
          silent: true,
        });

        successCount++;
      } catch (error) {
        failureCount++;
        console.error(`Failed to update ${ext.name}:`, error);
      }
    }

    if (failureCount === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Successfully updated ${successCount} extensions!`;
      toast.message = "";
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Updated ${successCount}, failed ${failureCount}`;
      toast.message =
        failureCount === outdatedExtensions.length ? "No extensions were updated." : "Some updates failed.";
    }

    await checkInstallations();
  }, [outdatedExtensions, targetInstallDir, checkInstallations]);

  const handleInstall = useCallback(
    async (ext: ZedExtension, versionOverride?: string) => {
      const targetVersion = versionOverride || ext.version;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: versionOverride ? `Installing ${ext.name} v${targetVersion}...` : `Installing ${ext.name}...`,
      });

      try {
        const downloadUrl = versionOverride
          ? getVersionedExtensionDownloadUrl(ext.id, targetVersion)
          : getLatestExtensionDownloadUrl(ext);

        await installExtension({
          downloadUrl,
          extensionId: ext.id,
          targetInstallDir,
          silent: true,
        });

        toast.style = Toast.Style.Success;
        toast.title = `Installed ${ext.name} v${targetVersion}!`;
        await checkInstallations();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Installation Failed";
        toast.message = String(error);
      }
    },
    [targetInstallDir, checkInstallations],
  );

  const handleUninstall = useCallback(
    async (ext: ZedExtension) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Uninstalling ${ext.name}...` });
      try {
        const targetDir = path.join(targetInstallDir, ext.id);

        await trash(targetDir);

        if (ext.id in ignoredMap) {
          const newMap = await removeExtensionIgnore(ext.id);
          setIgnoredMap(newMap);
        }

        toast.style = Toast.Style.Success;
        toast.title = `Uninstalled ${ext.name}`;
        await checkInstallations();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Uninstall Failed";
        toast.message = String(error);
      }
    },
    [targetInstallDir, ignoredMap, checkInstallations],
  );

  const handleIgnore = useCallback(async (ext: ZedExtension, label: string, durationMs: number | null) => {
    const newMap = await setExtensionIgnore(ext.id, durationMs);
    setIgnoredMap(newMap);
    await showToast({ style: Toast.Style.Success, title: `Updates Ignored: ${label}`, message: ext.name });
  }, []);

  const handleResume = useCallback(async (ext: ZedExtension) => {
    const newMap = await removeExtensionIgnore(ext.id);
    setIgnoredMap(newMap);
    await showToast({ style: Toast.Style.Success, title: "Updates Resumed", message: ext.name });
  }, []);

  const allProvidesOptions = useMemo(() => {
    const providesList = Object.values(extensionCache).flatMap((ext) => ext.provides || []);
    return Array.from(new Set(providesList)).sort();
  }, [extensionCache]);

  const filteredExtensions = useMemo(() => {
    return filterExtensions({
      extensions,
      searchText,
      selectedProvides,
      selectedStatus,
      installedExtensionsMap,
      ignoredMap,
    });
  }, [extensions, searchText, selectedProvides, selectedStatus, installedExtensionsMap, ignoredMap]);

  return (
    <List
      isShowingDetail
      navigationTitle="Manage Extensions"
      searchBarPlaceholder="Search extensions"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <ExtensionFilterDropdown
          allProvidesOptions={allProvidesOptions}
          selectedProvides={selectedProvides}
          selectedStatus={selectedStatus}
          onSelectedProvidesChange={setSelectedProvides}
          onSelectedStatusChange={setSelectedStatus}
        />
      }
    >
      <List.EmptyView
        title="No Extensions Found!"
        description="Refine your search, check your internet connection or try again later."
        icon="no-view.png"
        actions={
          <ActionPanel>
            <Action
              title="Force Clear Local Cache"
              icon={Icon.CircleProgress}
              style={Action.Style.Destructive}
              onAction={handleClearCache}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel>
        }
      />

      {outdatedExtensions.length > 0 && !searchText && (
        <List.Item
          title="Updates"
          icon={{ source: Icon.ArrowDownCircle, tintColor: "#FF9500" }}
          accessories={[{ text: `${outdatedExtensions.length} pending` }]}
          detail={
            <List.Item.Detail
              markdown={
                `### Pending Updates\n` +
                `The following extensions have newer versions available on the Zed registry:\n\n` +
                outdatedExtensions
                  .map((ext) => `* **${ext.name}** (\`v${installedExtensionsMap[ext.id]}\` → \`v${ext.version}\`)`)
                  .join("\n")
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Update All"
                icon={Icon.CheckCircle}
                onAction={handleUpdateAll}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            </ActionPanel>
          }
        />
      )}

      {filteredExtensions.map(({ ext, installedVersion, currentlyInstalled, isIgnored, isOutdated }) => (
        <ExtensionItem
          key={ext.id}
          extension={ext}
          isInstalled={currentlyInstalled}
          installedVersion={installedVersion}
          areUpdatesIgnored={isIgnored}
          actions={
            <ExtensionActions
              currentlyInstalled={currentlyInstalled}
              ext={ext}
              gramBuild={gramBuild}
              installedVersion={installedExtensionsMap[ext.id]}
              isIgnored={isIgnored}
              isOutdated={isOutdated}
              outdatedExtensionsCount={outdatedExtensions.length}
              onClearCache={handleClearCache}
              onIgnore={handleIgnore}
              onInstall={handleInstall}
              onResume={handleResume}
              onUninstall={handleUninstall}
              onUpdateAll={handleUpdateAll}
            />
          }
        />
      ))}
    </List>
  );
}

function ExtensionFilterDropdown({
  allProvidesOptions,
  selectedProvides,
  selectedStatus,
  onSelectedProvidesChange,
  onSelectedStatusChange,
}: {
  allProvidesOptions: string[];
  selectedProvides: string;
  selectedStatus: string;
  onSelectedProvidesChange: (value: string) => void;
  onSelectedStatusChange: (value: string) => void;
}) {
  const selectedFilterValue = getSelectedFilterDropdownValue(selectedStatus, selectedProvides);
  const selectedFilterLabel = getFilterDropdownLabel(selectedStatus, selectedProvides);
  const clearStatus = () => onSelectedStatusChange("all");
  const clearProvides = () => onSelectedProvidesChange("all");

  return (
    <List.Dropdown
      tooltip="Filter View"
      storeValue={false}
      value={selectedFilterValue}
      onChange={(value) => {
        if (value === "all") {
          onSelectedStatusChange("all");
          onSelectedProvidesChange("all");
        } else if (value.startsWith("status:")) {
          onSelectedStatusChange(value.replace("status:", ""));
        } else if (value.startsWith("provides:")) {
          onSelectedProvidesChange(value.replace("provides:", ""));
        } else if (value.startsWith("selected:")) {
          return;
        } else if (value === "clearStatus") {
          clearStatus();
        } else if (value === "clearProvides") {
          clearProvides();
        }
      }}
    >
      <List.Dropdown.Item title="All Extensions" value="all" />

      <List.Dropdown.Section title="Status">
        <List.Dropdown.Item title="Installed" value="status:installed" />
        <List.Dropdown.Item title="Not Installed" value="status:uninstalled" />
        <List.Dropdown.Item title="Outdated" value="status:outdated" />
        <List.Dropdown.Item title="Ignored" value="status:ignored" />
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Capabilities">
        {allProvidesOptions.map((item) => (
          <List.Dropdown.Item key={item} title={item} value={`provides:${item}`} />
        ))}
      </List.Dropdown.Section>

      {(selectedStatus !== "all" || selectedProvides !== "all") && (
        <List.Dropdown.Section title="Selected">
          <List.Dropdown.Item title={selectedFilterLabel} value={selectedFilterValue} />
        </List.Dropdown.Section>
      )}

      <List.Dropdown.Section title="Clear Filters">
        <List.Dropdown.Item title={`Clear Status Filter`} value="clearStatus" />
        <List.Dropdown.Item title={`Clear Capabilities Filter`} value="clearProvides" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function getSelectedFilterDropdownValue(selectedStatus: string, selectedProvides: string): string {
  if (selectedStatus === "all" && selectedProvides === "all") return "all";

  return `selected:${selectedStatus}:${selectedProvides}`;
}

function getFilterDropdownLabel(selectedStatus: string, selectedProvides: string): string {
  if (selectedStatus === "all" && selectedProvides === "all") return "All Extensions";

  return `Status: ${getStatusLabel(selectedStatus)} • Capabilities: ${getProvidesLabel(selectedProvides)}`;
}

function getStatusLabel(selectedStatus: string): string {
  switch (selectedStatus) {
    case "installed":
      return "Installed";
    case "uninstalled":
      return "Not Installed";
    case "outdated":
      return "Outdated";
    case "ignored":
      return "Ignored";
    default:
      return "All Extensions";
  }
}

function getProvidesLabel(selectedProvides: string): string {
  return selectedProvides === "all" ? "All Capabilities" : selectedProvides;
}

function ExtensionActions({
  currentlyInstalled,
  ext,
  gramBuild,
  installedVersion,
  isIgnored,
  isOutdated,
  outdatedExtensionsCount,
  onClearCache,
  onIgnore,
  onInstall,
  onResume,
  onUninstall,
  onUpdateAll,
}: {
  currentlyInstalled: boolean;
  ext: ZedExtension;
  gramBuild: GramBuild;
  installedVersion?: string;
  isIgnored: boolean;
  isOutdated: boolean;
  outdatedExtensionsCount: number;
  onClearCache: () => void;
  onIgnore: (ext: ZedExtension, label: string, durationMs: number | null) => void;
  onInstall: (ext: ZedExtension, versionOverride?: string) => Promise<void>;
  onResume: (ext: ZedExtension) => void;
  onUninstall: (ext: ZedExtension) => void;
  onUpdateAll: () => void;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!currentlyInstalled && (
          <Action title="Install Extension" icon={Icon.Download} onAction={() => onInstall(ext)} />
        )}
        {isOutdated && <Action title="Update Extension" icon={Icon.ArrowDownCircle} onAction={() => onInstall(ext)} />}
        <VersionSubmenu extension={ext} installedVersion={installedVersion} onInstall={onInstall} />

        <Action.OpenInBrowser title={`Open ${getDomainLabel(ext.repository)}`} url={ext.repository} />
      </ActionPanel.Section>

      {currentlyInstalled && (
        <ActionPanel.Section title="Management">
          <ActionPanel.Submenu
            title="Ignore Updates…"
            icon={isIgnored ? Icon.EyeDisabled : Icon.Clock}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          >
            {isIgnored && <Action title="Resume Updates" icon={Icon.Play} onAction={() => onResume(ext)} />}
            <Action title="Ignore for 1 Day" onAction={() => onIgnore(ext, "1 Day", 24 * 60 * 60 * 1000)} />
            <Action title="Ignore for 1 Week" onAction={() => onIgnore(ext, "1 Week", 7 * 24 * 60 * 60 * 1000)} />
            <Action title="Ignore Indefinitely" onAction={() => onIgnore(ext, "Indefinitely", null)} />
          </ActionPanel.Submenu>

          <Action.ShowInFinder
            title="View in Finder"
            path={path.join(getGramExtensionsDir(gramBuild), "installed", ext.id)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          <Action
            title="Uninstall Extension"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => onUninstall(ext)}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Global Actions">
        {outdatedExtensionsCount > 0 && (
          <Action
            title={`Update All Outdated (${outdatedExtensionsCount})`}
            icon={Icon.CheckCircle}
            onAction={onUpdateAll}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        )}
        <Action
          title="Force Clear Local Cache"
          icon={Icon.Eraser}
          style={Action.Style.Destructive}
          onAction={onClearCache}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

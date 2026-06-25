import { ActionPanel, Action, Cache, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getExtensionVersions, ExtensionVersionInfo, ZedExtension } from "../lib/extension";

const versionCache = new Cache({ namespace: "extension-versions" });

export function clearVersionCache() {
  versionCache.clear();
}

interface VersionSubmenuProps {
  extension: ZedExtension;
  installedVersion?: string;
  onInstall: (ext: ZedExtension, versionOverride?: string) => Promise<void>;
}

export function VersionSubmenu({ extension, installedVersion, onInstall }: VersionSubmenuProps) {
  const [versions, setVersions] = useState<ExtensionVersionInfo[]>(() => getCachedVersions(extension.id));
  const [isLoading, setIsLoading] = useState<boolean>(() => getCachedVersions(extension.id).length === 0);

  useEffect(() => {
    let isCancelled = false;

    const cachedVersions = getCachedVersions(extension.id);
    if (cachedVersions.length > 0) {
      setVersions(cachedVersions);
      setIsLoading(false);
      return () => {
        isCancelled = true;
      };
    }

    setIsLoading(true);

    async function loadData() {
      try {
        const fetchedVersions = await getExtensionVersions(extension.id);
        if (isCancelled) return;

        setVersions(fetchedVersions);
        versionCache.set(extension.id, JSON.stringify(fetchedVersions));
      } catch (error) {
        console.error("Failed to load extension versions:", error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [extension.id]);

  if (isLoading) {
    return (
      <ActionPanel.Submenu title="Install a Specific Version…" icon={Icon.Layers}>
        <Action title="Loading Available Versions…" icon={Icon.Hourglass} />
      </ActionPanel.Submenu>
    );
  }

  return (
    <ActionPanel.Submenu title="Install a Specific Version…" icon={Icon.Layers}>
      {versions.length === 0 ? (
        <Action title="No Versions Found" icon={Icon.Info} />
      ) : (
        versions.map((v, index) => {
          const isLatest = index === 0;
          const isInstalled = v.version === installedVersion;
          const isUpdateAvailable = !!installedVersion && installedVersion !== versions[0]?.version;

          let versionIcon = Icon.Box;

          if (isInstalled) {
            versionIcon = Icon.Checkmark;
          } else if (isLatest) {
            versionIcon = Icon.Star;
          }

          let statusBadge = "";
          if (isLatest && isInstalled) {
            statusBadge = " (Latest)";
          } else if (isInstalled) {
            statusBadge = " (Installed)";
          } else if (isLatest && isUpdateAvailable) {
            statusBadge = " (Update Available)";
          } else if (isLatest) {
            statusBadge = " (Latest)";
          }

          return (
            <Action
              key={v.version}
              title={`${v.version}${statusBadge} • ${new Date(v.published_at).toLocaleDateString("en-US")}`}
              icon={versionIcon}
              onAction={() => onInstall(extension, v.version)}
            />
          );
        })
      )}
    </ActionPanel.Submenu>
  );
}

function getCachedVersions(extensionId: string): ExtensionVersionInfo[] {
  const cachedValue = versionCache.get(extensionId);
  if (!cachedValue) return [];

  try {
    const parsed = JSON.parse(cachedValue) as ExtensionVersionInfo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

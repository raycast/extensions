import { ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getExtensionVersions, ExtensionVersionInfo, ZedExtension } from "../lib/extension";

interface VersionSubmenuProps {
  extension: ZedExtension;
  installedVersion?: string;
  onInstall: (ext: ZedExtension, versionOverride?: string) => Promise<void>;
}

export function VersionSubmenu({ extension, installedVersion, onInstall }: VersionSubmenuProps) {
  const [versions, setVersions] = useState<ExtensionVersionInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const fetchedVersions = await getExtensionVersions(extension.id);
        setVersions(fetchedVersions);
      } catch (error) {
        console.error("Failed to load extension versions:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
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
      {versions.map((v, index) => {
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
            title={`${v.version}${statusBadge} • ${new Date(v.published_at).toLocaleDateString()}`}
            icon={versionIcon}
            onAction={() => onInstall(extension, v.version)}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}

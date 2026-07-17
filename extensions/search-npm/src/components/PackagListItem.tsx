import tinyRelativeDate from "tiny-relative-date";
import { Action, ActionPanel, Icon, Keyboard, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import type { Downloads, Package } from "@/model/npmResponse.model";
import { addFavorite, removeAllItemsFromFavorites, removeItemFromFavorites } from "@/utils/favorite-storage";
import { formatDownloads } from "@/utils/format";
import { getChangeLogUrl } from "@/utils/getChangelogUrl";
import type { HistoryItem } from "@/utils/history-storage";
import { addToHistory, removeItemFromHistory } from "@/utils/history-storage";
import { parseRepoUrl } from "@/utils/parseRepoUrl";
import { Readme } from "@/screens/Readme";
import { CopyInstallCommandActions } from "@/components/CopyInstallCommandActions";
import Favorites from "@/favorites";

interface PackageListItemProps {
  result: Package;
  searchTerm?: string;
  setHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  isFavorited: boolean;
  handleFaveChange?: () => Promise<void>;
  isViewingFavorites?: boolean;
  isHistoryItem?: boolean;
  downloads?: Downloads;
}

export const PackageListItem = ({
  result,
  setHistory,
  isFavorited,
  handleFaveChange,
  isViewingFavorites,
  isHistoryItem,
  downloads,
}: PackageListItemProps) => {
  const { defaultOpenAction, historyCount } = getPreferenceValues<ExtensionPreferences>();
  const pkg = result;
  const { owner, name, type, repoUrl } = parseRepoUrl(pkg.links?.repository);
  const changelogUrl = getChangeLogUrl(type, owner, name);

  const handleAddToHistory = async () => {
    const history = await addToHistory({
      term: pkg.name,
      type: "package",
      package: result,
    });
    if (Number(historyCount) <= 0) return;
    setHistory?.(history);
    showToast(Toast.Style.Success, `Added ${result.name} to history`);
  };
  const handleAddToFaves = async () => {
    await addFavorite(result);
    showToast(Toast.Style.Success, `Added ${result.name} to faves`);
    handleFaveChange?.();
  };
  const handleRemoveFromFaves = async () => {
    await removeItemFromFavorites(result);
    showToast(Toast.Style.Success, `Removed ${result.name} from faves`);
    handleFaveChange?.();
  };
  const handleRemoveAllFaves = async () => {
    await removeAllItemsFromFavorites();
    showToast(Toast.Style.Success, `Removed ${result.name} from faves`);
    handleFaveChange?.();
  };

  const openActions = {
    openRepository: repoUrl ? (
      <Action.OpenInBrowser key="openRepository" url={repoUrl} title="Open Repository" onOpen={handleAddToHistory} />
    ) : null,
    openHomepage:
      pkg.links?.homepage && pkg.links.homepage !== repoUrl ? (
        <Action.OpenInBrowser
          key="openHomepage"
          url={pkg.links.homepage}
          title="Open Homepage"
          icon={Icon.Link}
          onOpen={handleAddToHistory}
        />
      ) : null,
    npmPackagePage: (
      <Action.OpenInBrowser
        key="npmPackagePage"
        url={pkg.links.npm}
        title="Open npm Package Page"
        icon={{
          source: "command-icon.png",
        }}
        onOpen={handleAddToHistory}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    ),
    changelogPackagePage: changelogUrl ? (
      <Action.OpenInBrowser key="openChangelog" url={changelogUrl} title="Open Changelog" />
    ) : null,
    skypackPackagePage: (
      <Action.OpenInBrowser
        url={`https://www.skypack.dev/view/${pkg.name}`}
        title="Skypack Package Page"
        key="skypackPackagePage"
        onOpen={handleAddToHistory}
      />
    ),
    npmxPackagePage: (
      <Action.OpenInBrowser
        url={`https://npmx.dev/package/${pkg.name}`}
        title="Open npmx Package Page"
        icon={{
          source: "npmx.png",
        }}
        key="npmxPackagePage"
        onOpen={handleAddToHistory}
      />
    ),
  };

  const keywords = Array.isArray(pkg.keywords) ? pkg.keywords : typeof pkg.keywords === "string" ? [pkg.keywords] : [];

  const subtitle =
    pkg.description != null && String(pkg.description).length > 0
      ? `v${pkg.version} · ${pkg.description}`
      : `v${pkg.version}`;

  // Sorting: last_updated -> downloads -> keywords -> favorited
  // Sorting intent: ensure the accessory icons on the right side of the list are aligned for a better user experience
  const accessories: List.Item.Accessory[] = [];

  if (!isViewingFavorites) {
    // Last updated
    accessories.unshift({
      icon: Icon.Calendar,
      tooltip: `Last updated: ${tinyRelativeDate(new Date(pkg.date))}`,
    });

    // downloads
    if (downloads) {
      const downloadsTooltip = [
        `Weekly downloads: ${formatDownloads(downloads.weekly)}`,
        `Monthly downloads: ${formatDownloads(downloads.monthly)}`,
      ];
      accessories.unshift({
        icon: Icon.Download,
        tooltip: downloadsTooltip.join("\n"),
      });
    }
  }

  if (keywords?.length) {
    // keywords
    accessories.unshift({
      icon: Icon.Tag,
      tooltip: `keywords: ${keywords.join(", ")}`,
    });
  }

  if (!isViewingFavorites) {
    if (isFavorited) {
      // favorited
      accessories.unshift({
        icon: Icon.Star,
      });
    }
  }

  return (
    <List.Item
      id={pkg.name}
      key={pkg.name}
      title={pkg.name}
      subtitle={subtitle}
      icon={Icon.Box}
      accessories={accessories}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            {Object.entries(openActions)
              .sort(([a]) => {
                if (a === defaultOpenAction) {
                  return -1;
                } else {
                  return 0;
                }
              })
              .map(([, action]) => {
                if (!action) {
                  return null;
                }
                return action;
              })
              .filter(Boolean)}
          </ActionPanel.Section>
          <ActionPanel.Section title="Actions">
            {isFavorited ? (
              <Action
                title="Remove from Favorites"
                onAction={handleRemoveFromFaves}
                icon={Icon.StarDisabled}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "s" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                }}
                style={Action.Style.Destructive}
              />
            ) : (
              <Action
                title="Add to Favorites"
                onAction={handleAddToFaves}
                icon={Icon.Star}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "s" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                }}
              />
            )}
            {isViewingFavorites ? (
              <Action
                title="Remove All Favorites"
                onAction={handleRemoveAllFaves}
                icon={Icon.Trash}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "backspace" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "backspace" },
                }}
                style={Action.Style.Destructive}
              />
            ) : (
              <Action.Push title="View Favorites" target={<Favorites />} icon={Icon.ArrowRight} />
            )}
            {isHistoryItem && (
              <Action
                title="Remove from History"
                onAction={async () => {
                  const history = await removeItemFromHistory({
                    term: pkg.name,
                    type: "package",
                  });
                  setHistory?.(history);
                }}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            {type === "github" && owner && name ? (
              <Action.Push title="View Readme" target={<Readme user={owner} repo={name} />} icon={Icon.Paragraph} />
            ) : null}
            <Action.OpenInBrowser
              url={`https://bundlephobia.com/package/${pkg.name}`}
              title="Open Bundlephobia"
              icon={Icon.LevelMeter}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
              }}
            />
            <Action.OpenInBrowser
              url={`https://esm.sh/${pkg.name}`}
              title="Open Esm.sh URL"
              icon={Icon.Cloud}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "e" },
                Windows: { modifiers: ["ctrl", "shift"], key: "e" },
              }}
            />
            {repoUrl && type === "github" ? (
              <Action.OpenInBrowser
                url={repoUrl.replace("github.com", "github.dev")}
                title="View Code in Github.dev"
                icon={{
                  source: {
                    light: "github-bright.png",
                    dark: "github-dark.png",
                  },
                }}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "." },
                  Windows: { modifiers: ["ctrl"], key: "." },
                }}
              />
            ) : null}
            {type === "github" || (type === "gitlab" && owner && name) ? (
              <Action.OpenInBrowser
                url={`https://codesandbox.io/s/${type === "github" ? "github" : "gitlab"}/${owner}/${name}`}
                title="View in Codesandbox"
                icon={{
                  source: {
                    light: "codesandbox-bright.png",
                    dark: "codesandbox-dark.png",
                  },
                }}
              />
            ) : null}
            <Action.OpenInBrowser
              url={`https://snyk.io/vuln/npm:${pkg.name}`}
              title="Open Snyk Vulnerability Check"
              icon={{
                source: {
                  light: "snyk-bright.png",
                  dark: "snyk-dark.png",
                },
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyInstallCommandActions packageName={pkg.name} />
            <Action.CopyToClipboard title="Copy Package Name" content={pkg.name} />
            <Action.CopyToClipboard title="Copy Version" content={pkg.version} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
